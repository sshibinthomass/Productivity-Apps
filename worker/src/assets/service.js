import { ApiError } from '../http/errors.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function assetError(message, status = 400) {
  return new ApiError('invalid_asset', message, status)
}

function hasPrefix(bytes, prefix) {
  return prefix.every((byte, index) => bytes[index] === byte)
}

function matchesSignature(contentType, bytes) {
  if (contentType === 'image/png') return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (contentType === 'image/jpeg') return hasPrefix(bytes, [0xff, 0xd8, 0xff])
  if (contentType === 'image/gif') return hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  return hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && hasPrefix(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
}

function publicUrl(publicOrigin, siteId, revision, assetId) {
  return `${publicOrigin}/assets/${encodeURIComponent(siteId)}/${encodeURIComponent(revision)}/${encodeURIComponent(assetId)}`
}

function contentDisposition(assetId) {
  return `inline; filename="${assetId}"`
}

export function createAssetService({ bucket, db, publicOrigin, createId = () => crypto.randomUUID() } = {}) {
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
      await db.prepare(`INSERT INTO site_assets (id, site_id, owner_id, object_key, content_type, size_bytes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)`).bind(assetId, siteId, userId, objectKey, contentType, body.byteLength).run()
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

  async function promoteReferenced({ userId, siteId, draft } = {}) {
    await ownedSite(userId, siteId)
    const revision = draft?.draftRevision
    if (!Number.isInteger(revision) || revision < 1) throw assetError('The draft revision is invalid.')
    const { results } = await db.prepare(`SELECT id, object_key, content_type FROM site_assets
      WHERE site_id = ?1 AND owner_id = ?2`).bind(siteId, userId).all()
    const byKey = new Map(results.map((asset) => [asset.object_key, asset]))
    const promoted = new Map()
    const publicPaths = []

    async function promote(path) {
      const asset = byKey.get(path)
      if (!asset) throw assetError('The draft references an unavailable image.')
      if (promoted.has(path)) return promoted.get(path)
      const targetKey = `public/${siteId}/${revision}/${asset.id}`
      const existing = await bucket.head(targetKey)
      if (!existing) {
        const source = await bucket.get(asset.object_key)
        if (!source) throw assetError('The draft references an unavailable image.')
        await bucket.put(targetKey, source.body, { httpMetadata: { contentType: asset.content_type, contentDisposition: contentDisposition(asset.id) } })
        publicPaths.push(targetKey)
      }
      const url = publicUrl(publicOrigin, siteId, revision, asset.id)
      promoted.set(path, url)
      return url
    }

    const nextDraft = structuredClone(draft)
    try {
      for (const block of nextDraft.blocks ?? []) {
        if (!block?.content || typeof block.content !== 'object') continue
        if (typeof block.content.storagePath === 'string' && block.content.storagePath) {
          const url = await promote(block.content.storagePath)
          block.content.storagePath = url
          block.content.url = url
        }
        if (typeof block.content.avatarStoragePath === 'string' && block.content.avatarStoragePath) {
          const url = await promote(block.content.avatarStoragePath)
          block.content.avatarStoragePath = url
          block.content.avatarUrl = url
        }
      }
      if (typeof nextDraft.seo?.socialImagePath === 'string' && nextDraft.seo.socialImagePath) {
        nextDraft.seo.socialImagePath = await promote(nextDraft.seo.socialImagePath)
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

  async function deleteSiteAssets({ userId, siteId } = {}) {
    await ownedSite(userId, siteId)
    const { results } = await db.prepare('SELECT object_key FROM site_assets WHERE site_id = ?1 AND owner_id = ?2').bind(siteId, userId).all()
    const publicObjects = await bucket.list({ prefix: `public/${siteId}/` })
    await Promise.all([...results.map(({ object_key: key }) => bucket.delete(key)), ...publicObjects.objects.map(({ key }) => bucket.delete(key))])
    await db.prepare('DELETE FROM site_assets WHERE site_id = ?1 AND owner_id = ?2').bind(siteId, userId).run()
  }

  return { uploadDraft, getDraft, getPublic, promoteReferenced, deleteSiteAssets, cleanupObsolete }
}
