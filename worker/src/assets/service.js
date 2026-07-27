import { ApiError } from '../http/errors.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function assetError(message, status = 400) {
  return new ApiError('invalid_asset', message, status)
}

function hasPrefix(bytes, prefix) {
  return prefix.every((byte, index) => bytes[index] === byte)
}

function readU32BE(bytes, offset) { return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3] }
function readU32LE(bytes, offset) { return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + ((bytes[offset + 3] << 24) >>> 0) }

function validPng(bytes) {
  if (!hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return false
  let offset = 8; let first = true
  while (offset + 12 <= bytes.length) {
    const length = readU32BE(bytes, offset); const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8)); const end = offset + 12 + length
    if (end > bytes.length) return false
    if (first && (type !== 'IHDR' || length !== 13)) return false
    if (type === 'IEND') return length === 0 && end === bytes.length
    first = false; offset = end
  }
  return false
}

function validJpeg(bytes) {
  if (!hasPrefix(bytes, [0xff, 0xd8])) return false
  let offset = 2; let sawFrame = false; let sawScan = false; let inScan = false
  while (offset < bytes.length) {
    if (inScan) {
      if (bytes[offset++] !== 0xff) continue
      if (offset >= bytes.length) return false
      const scanByte = bytes[offset]
      if (scanByte === 0x00 || (scanByte >= 0xd0 && scanByte <= 0xd7)) { offset += 1; continue }
      if (scanByte === 0xff) continue
      if (scanByte === 0xd9) return sawFrame && sawScan && offset + 1 === bytes.length
      inScan = false
    }
    if (bytes[offset++] !== 0xff) return false
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset++]
    if (marker === 0xd9) return sawFrame && sawScan && offset === bytes.length
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > bytes.length) return false
    const length = (bytes[offset] << 8) + bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length) return false
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) sawFrame = true
    if (marker === 0xda) { sawScan = true; inScan = true }
    offset += length
  }
  return false
}

function validGif(bytes) {
  if (!(hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) || bytes.length < 14) return false
  let offset = 13
  if (bytes[10] & 0x80) offset += 3 * (2 ** ((bytes[10] & 7) + 1))
  while (offset < bytes.length) {
    const marker = bytes[offset++]
    if (marker === 0x3b) return offset === bytes.length
    if (marker === 0x21) { offset += 1 } else if (marker === 0x2c) { offset += 9; if (offset > bytes.length) return false; if (bytes[offset - 1] & 0x80) offset += 3 * (2 ** ((bytes[offset - 1] & 7) + 1)); offset += 1 } else return false
    while (offset < bytes.length) { const length = bytes[offset++]; if (length === 0) break; offset += length; if (offset > bytes.length) return false }
  }
  return false
}

function validWebp(bytes) {
  if (!hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) || !hasPrefix(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]) || readU32LE(bytes, 4) !== bytes.length - 8) return false
  let offset = 12; let imageChunk = false
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.slice(offset, offset + 4)); const length = readU32LE(bytes, offset + 4); const end = offset + 8 + length + (length % 2)
    if (end > bytes.length) return false
    if (['VP8 ', 'VP8L', 'VP8X'].includes(type)) imageChunk = true
    offset = end
  }
  return imageChunk && offset === bytes.length
}

function matchesSignature(contentType, bytes) {
  if (contentType === 'image/png') return validPng(bytes)
  if (contentType === 'image/jpeg') return validJpeg(bytes)
  if (contentType === 'image/gif') return validGif(bytes)
  return validWebp(bytes)
}

function publicUrl(publicOrigin, siteId, revision, assetId) {
  return `${publicOrigin}/assets/${encodeURIComponent(siteId)}/${encodeURIComponent(revision)}/${encodeURIComponent(assetId)}`
}

function contentDisposition(assetId) {
  return `inline; filename="${assetId}"`
}

export function createAssetService({ bucket, db, publicOrigin, createId = () => crypto.randomUUID(), beforePublicDelete } = {}) {
  if (!bucket) throw new TypeError('An R2 bucket is required.')
  if (!db) throw new TypeError('A D1 database is required.')
  if (!publicOrigin) throw new TypeError('A public asset origin is required.')

  async function ownedSite(userId, siteId) {
    const site = await db.prepare('SELECT id FROM mini_sites WHERE id = ?1 AND owner_id = ?2 LIMIT 1').bind(siteId, userId).first()
    if (!site) throw new ApiError('not_found', 'This mini-site could not be found.', 404)
  }

  async function uploadDraft({ userId, siteId, file, request } = {}) {
    await ownedSite(userId, siteId)
    if (!file && request) {
      const form = await request.formData()
      file = form.get('file')
    }
    if (!file || typeof file.arrayBuffer !== 'function' || !Number.isFinite(file.size)) throw assetError('Choose an image file to upload.')
    if (file.size > MAX_IMAGE_BYTES) throw assetError('Images must not exceed 5 MiB.', 413)
    const contentType = String(file.type ?? '').toLowerCase()
    if (!SUPPORTED_TYPES.has(contentType)) throw assetError('Use a JPEG, PNG, WebP, or GIF image.')
    const body = new Uint8Array(await file.arrayBuffer())
    if (body.byteLength > MAX_IMAGE_BYTES || !matchesSignature(contentType, body)) throw assetError('The image contents do not match its declared type.')

    const assetId = createId()
    const objectKey = `drafts/${userId}/${siteId}/${assetId}`
    await bucket.put(objectKey, body, { httpMetadata: { contentType, contentDisposition: contentDisposition(assetId) } })
    try {
      const metadata = await db.prepare(`INSERT INTO site_assets (id, site_id, owner_id, object_key, content_type, size_bytes)
        SELECT ?1, ?2, ?3, ?4, ?5, ?6
        WHERE EXISTS (SELECT 1 FROM mini_sites WHERE id = ?2 AND owner_id = ?3)`)
        .bind(assetId, siteId, userId, objectKey, contentType, body.byteLength).run()
      if (metadata.meta.changes !== 1) throw new ApiError('not_found', 'This mini-site could not be found.', 404)
    } catch (error) {
      await bucket.delete(objectKey)
      throw error
    }
    return { assetId, storagePath: objectKey, url: `https://api.shibinthomas.com/v1/sites/${encodeURIComponent(siteId)}/assets/${encodeURIComponent(assetId)}` }
  }

  async function getDraft({ userId, siteId, assetId } = {}) {
    await ownedSite(userId, siteId)
    const asset = await db.prepare(`SELECT object_key, content_type FROM site_assets
      WHERE id = ?1 AND site_id = ?2 AND owner_id = ?3 LIMIT 1`).bind(assetId, siteId, userId).first()
    if (!asset) throw new ApiError('not_found', 'This asset could not be found.', 404)
    const object = await bucket.get(asset.object_key)
    if (!object) throw new ApiError('not_found', 'This asset could not be found.', 404)
    return { object, contentType: asset.content_type }
  }

  async function getPublic({ siteId, revision, assetId } = {}) {
    return bucket.get(`public/${siteId}/${revision}/${assetId}`)
  }

  async function promoteReferenced({ userId, siteId, draft, attemptId } = {}) {
    await ownedSite(userId, siteId)
    const revision = draft?.draftRevision
    if (!Number.isInteger(revision) || revision < 1) throw assetError('The draft revision is invalid.')
    const { results } = await db.prepare(`SELECT id, object_key, content_type FROM site_assets
      WHERE site_id = ?1 AND owner_id = ?2`).bind(siteId, userId).all()
    const byKey = new Map(results.map((asset) => [asset.object_key, asset]))
    const promoted = new Map()
    const publicPaths = []
    const attempt = typeof attemptId === 'string' && attemptId ? attemptId : createId()

    async function promote(path) {
      const asset = byKey.get(path)
      if (!asset) throw assetError('The draft references an unavailable image.')
      if (promoted.has(path)) return promoted.get(path)
      const targetKey = `public/${siteId}/${revision}/${asset.id}`
      const stagingKey = `staging/${siteId}/${revision}/${attempt}/${asset.id}`
      const existing = await bucket.head(targetKey)
      if (!existing) {
        const source = await bucket.get(asset.object_key)
        if (!source) throw assetError('The draft references an unavailable image.')
        await bucket.put(stagingKey, source.body, { httpMetadata: { contentType: asset.content_type, contentDisposition: contentDisposition(asset.id) } })
        publicPaths.push(stagingKey)
        const staged = await bucket.get(stagingKey)
        await bucket.put(targetKey, staged.body, { httpMetadata: { contentType: asset.content_type, contentDisposition: contentDisposition(asset.id) } })
      }
      const url = publicUrl(publicOrigin, siteId, revision, asset.id)
      promoted.set(path, url)
      return url
    }

    const nextDraft = structuredClone(draft)
    try {
      for (const block of nextDraft.blocks ?? []) {
        if (!block?.content || typeof block.content !== 'object') continue
        if (block.visible === false || !['image', 'profile'].includes(block.type)) continue
        if (block.type === 'image' && typeof block.content.storagePath === 'string' && block.content.storagePath) {
          const url = await promote(block.content.storagePath)
          block.content.storagePath = url
          block.content.url = url
        }
        if (block.type === 'profile' && typeof block.content.avatarStoragePath === 'string' && block.content.avatarStoragePath) {
          const url = await promote(block.content.avatarStoragePath)
          block.content.avatarStoragePath = url
          block.content.avatarUrl = url
        }
      }
      if (typeof nextDraft.seo?.socialImagePath === 'string' && nextDraft.seo.socialImagePath) {
        nextDraft.seo.socialImageUrl = await promote(nextDraft.seo.socialImagePath)
        delete nextDraft.seo.socialImagePath
      }
      return { draft: nextDraft, publicPaths }
    } catch (error) {
      await Promise.all(publicPaths.map((key) => bucket.delete(key)))
      throw error
    }
  }

  async function cleanupObsolete({ publicPaths = [] } = {}) {
    await Promise.all(publicPaths.map((key) => bucket.delete(key)))
  }

  async function deleteSiteAssets({ siteId, assetKeys = [] } = {}) {
    const publicKeys = []
    let cursor
    do {
      const page = await bucket.list({ prefix: `public/${siteId}/`, ...(cursor ? { cursor } : {}) })
      publicKeys.push(...page.objects.map(({ key }) => key)); cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    await Promise.all([...assetKeys, ...publicKeys].map((key) => bucket.delete(key)))
  }

  async function cleanupObsoletePublicAssets({ now = new Date(), graceMilliseconds = 7 * 24 * 60 * 60 * 1000, pageSize = 25, deleteBudget = 25 } = {}) {
    const cutoff = new Date(now.getTime() - graceMilliseconds)
    const budget = Math.max(0, Math.floor(deleteBudget))
    if (budget === 1) {
      const scheduler = await db.prepare("SELECT phase FROM maintenance_cursors WHERE name = 'public_asset_cleanup_scheduler'").first()
      const publicObject = scheduler?.phase !== 'staging'
      await cleanupPrefix({
        name: publicObject ? 'public_asset_cleanup_public' : 'public_asset_cleanup_staging',
        prefix: publicObject ? 'public/' : 'staging/', budget, pageSize, cutoff, now, publicObject,
      })
      await db.prepare(`INSERT INTO maintenance_cursors (name, phase, cursor, updated_at) VALUES ('public_asset_cleanup_scheduler', ?1, NULL, ?2)
        ON CONFLICT(name) DO UPDATE SET phase = excluded.phase, cursor = NULL, updated_at = excluded.updated_at`)
        .bind(publicObject ? 'staging' : 'public', now.toISOString()).run()
      return
    }
    const publicBudget = Math.ceil(budget / 2); const stagingBudget = budget - publicBudget
    await cleanupPrefix({ name: 'public_asset_cleanup_public', prefix: 'public/', budget: publicBudget, pageSize, cutoff, now, publicObject: true })
    await cleanupPrefix({ name: 'public_asset_cleanup_staging', prefix: 'staging/', budget: stagingBudget, pageSize, cutoff, now, publicObject: false })
  }

  async function cleanupPrefix({ name, prefix, budget, pageSize, cutoff, now, publicObject }) {
    if (budget < 1) return
    const state = await db.prepare('SELECT cursor FROM maintenance_cursors WHERE name = ?1').bind(name).first()
    const page = await bucket.list({ prefix, ...(state?.cursor ? { cursor: state.cursor } : {}), limit: Math.min(pageSize, budget) })
    let deleted = 0
    for (const object of page.objects) {
      if (deleted >= budget || !(object.uploaded instanceof Date) || object.uploaded >= cutoff) continue
      let eligible = true
      if (publicObject) {
        await beforePublicDelete?.(object.key)
        eligible = await obsoletePublicRevision(object.key)
      }
      if (eligible) { await bucket.delete(object.key); deleted += 1 }
    }
    if (page.truncated) await db.prepare(`INSERT INTO maintenance_cursors (name, phase, cursor, updated_at) VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(name) DO UPDATE SET cursor = excluded.cursor, updated_at = excluded.updated_at`).bind(name, publicObject ? 'public' : 'staging', page.cursor, now.toISOString()).run()
    else await db.prepare('DELETE FROM maintenance_cursors WHERE name = ?1').bind(name).run()
  }

  async function obsoletePublicRevision(key) {
    const match = /^public\/([^/]+)\/(\d+)\/[^/]+$/.exec(key)
    if (!match) return false
    const published = await db.prepare('SELECT revision FROM published_sites WHERE site_id = ?1 LIMIT 1').bind(match[1]).first()
    // A missing publication may be in-flight. Only an already newer revision proves this key obsolete.
    return Boolean(published && Number(match[2]) < published.revision)
  }

  return { uploadDraft, getDraft, getPublic, promoteReferenced, deleteSiteAssets, cleanupObsolete, cleanupObsoletePublicAssets }
}
