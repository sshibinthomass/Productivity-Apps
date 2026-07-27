import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAssetService } from '../src/assets/service.js'
import { createWorker } from '../src/index.js'
import { createMiniSiteService } from '../src/sites/service.js'
import { resetDatabase } from './support/database.js'
import { ApiError } from '../src/http/errors.js'

const apiOrigin = 'https://api.shibinthomas.com'
const appOrigin = 'https://app.shibinthomas.com'
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...new Uint8Array(13), 0, 0, 0, 0, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0])
const jpeg = Uint8Array.from(atob('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z'), (char) => char.charCodeAt(0))
const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0x3b])
const realJpeg = Uint8Array.from(atob([
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a',
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy',
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA',
  'AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA',
  'AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3',
  'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm',
  'p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA',
  'AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx',
  'BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK',
  'U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3',
  'uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK',
  '+ZP3E//Z',
].join('')), (char) => char.charCodeAt(0))
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 14, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 1, 0, 0, 0, 0, 0])

function file(bytes = png, type = 'image/png') {
  return new File([bytes], 'image', { type })
}

async function insertSite({ id = 'site-1', ownerId = 'owner-1' } = {}) {
  const draft = { siteId: id, name: 'Maya', slug: `${id}-page`, templateId: 'blank', blocks: [], theme: {}, seo: {} }
  await env.DB.prepare(`INSERT INTO mini_sites (id, owner_id, name, slug, template_id, draft_json, draft_revision, published_revision, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`)
    .bind(id, ownerId, 'Maya', `${id}-page`, 'blank', JSON.stringify(draft), '2026-07-26T00:00:00.000Z', '2026-07-26T00:00:00.000Z').run()
}

function sessionLookup(_auth, request) {
  if (request.headers.get('Cookie') === 'session=owner') return { id: 'owner-1' }
  if (request.headers.get('Cookie') === 'session=other') return { id: 'owner-2' }
  throw new ApiError('unauthenticated', 'Sign in is required.', 401)
}

describe('R2 mini-site assets', () => {
  let assets

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    assets = createAssetService({ bucket: env.MEDIA, db: env.DB, publicOrigin: 'https://links.shibinthomas.com', createId: (() => { let id = 0; return () => `asset-${++id}` })() })
    await insertSite()
  })

  it('checks site ownership before consuming an upload', async () => {
    let reads = 0
    const upload = { get size() { return 1 }, get type() { return 'image/png' }, async arrayBuffer() { reads += 1; return png.buffer } }

    await expect(assets.uploadDraft({ userId: 'owner-2', siteId: 'site-1', file: upload })).rejects.toMatchObject({ code: 'not_found' })
    expect(reads).toBe(0)
  })

  it('rejects files larger than five MiB', async () => {
    await expect(assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(new Uint8Array(5 * 1024 * 1024 + 1)) })).rejects.toMatchObject({ code: 'invalid_asset' })
  })

  it.each([
    ['image/png', png], ['image/jpeg', realJpeg], ['image/gif', gif], ['image/webp', webp],
  ])('accepts the %s signature only when it matches the declared MIME type', async (type, bytes) => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(bytes, type) })
    expect(uploaded).toMatchObject({ assetId: expect.any(String), storagePath: `drafts/owner-1/site-1/${uploaded.assetId}`, url: `${apiOrigin}/v1/sites/site-1/assets/${uploaded.assetId}` })
  })

  it('uses the configured API origin for private draft asset URLs', async () => {
    const localAssets = createAssetService({
      bucket: env.MEDIA,
      db: env.DB,
      publicOrigin: 'http://127.0.0.1:8787',
      apiOrigin: 'http://127.0.0.1:8787',
      createId: () => 'local-asset',
    })

    await expect(localAssets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })).resolves.toMatchObject({
      url: 'http://127.0.0.1:8787/v1/sites/site-1/assets/local-asset',
    })
  })

  it('rejects a PNG label with non-PNG bytes', async () => {
    await expect(assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(jpeg, 'image/png') })).rejects.toMatchObject({ code: 'invalid_asset' })
  })

  it.each([
    ['PNG without IEND', 'image/png', png.slice(0, -12)],
    ['JPEG with a truncated scan', 'image/jpeg', realJpeg.slice(0, -2)],
    ['GIF without a trailer', 'image/gif', gif.slice(0, -1)],
    ['WebP with a false RIFF length', 'image/webp', new Uint8Array([...webp.slice(0, 4), 1, 0, 0, 0, ...webp.slice(8)])],
    ['a PNG polyglot with appended bytes', 'image/png', new Uint8Array([...png, 1])],
  ])('rejects structurally invalid %s', async (_label, type, bytes) => {
    await expect(assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(bytes, type) })).rejects.toMatchObject({ code: 'invalid_asset' })
  })

  it('uses a server-generated R2 key and writes D1 metadata after the object exists', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    expect(uploaded.storagePath).toBe('drafts/owner-1/site-1/asset-1')
    await expect(env.MEDIA.get(uploaded.storagePath)).resolves.toBeTruthy()
    await expect(env.DB.prepare('SELECT object_key, content_type FROM site_assets WHERE id = ?').bind(uploaded.assetId).first()).resolves.toEqual({ object_key: uploaded.storagePath, content_type: 'image/png' })
  })

  it('puts R2 before metadata and compensates the object when metadata insertion fails', async () => {
    const calls = []
    const bucket = {
      async put(key) { calls.push(`put:${key}`) }, async delete(key) { calls.push(`delete:${key}`) },
    }
    const db = { prepare(sql) { return { bind() { return {
      async first() { return sql.includes('mini_sites') ? { id: 'site-1' } : null },
      async run() { calls.push('insert'); throw new Error('D1 write failed') },
    } } } } }
    const failing = createAssetService({ bucket, db, publicOrigin: 'https://links.shibinthomas.com', createId: () => 'asset-fail' })
    await expect(failing.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })).rejects.toThrow('D1 write failed')
    expect(calls).toEqual(['put:drafts/owner-1/site-1/asset-fail', 'insert', 'delete:drafts/owner-1/site-1/asset-fail'])
  })

  it('compensates a draft object when a site is deleted while its R2 put is paused', async () => {
    let releasePut; let putStarted
    const putGate = new Promise((resolve) => { releasePut = resolve })
    const started = new Promise((resolve) => { putStarted = resolve })
    const bucket = {
      get: (...args) => env.MEDIA.get(...args), head: (...args) => env.MEDIA.head(...args), list: (...args) => env.MEDIA.list(...args), delete: (...args) => env.MEDIA.delete(...args),
      async put(key, ...args) { putStarted(); await putGate; return env.MEDIA.put(key, ...args) },
    }
    const racing = createAssetService({ bucket, db: env.DB, publicOrigin: 'https://links.shibinthomas.com', createId: () => 'asset-race' })
    const upload = racing.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    await started
    const { createD1Store } = await import('../src/sites/d1Store.js')
    await expect(createD1Store({ db: env.DB }).delete({ userId: 'owner-1', siteId: 'site-1', confirmationName: 'Maya' })).resolves.toEqual({ deleted: true })
    releasePut()
    await expect(upload).rejects.toMatchObject({ code: 'not_found' })
    await expect(env.MEDIA.get('drafts/owner-1/site-1/asset-race')).resolves.toBeNull()
    await expect(env.DB.prepare('SELECT * FROM site_assets WHERE id = ?').bind('asset-race').first()).resolves.toBeNull()
  })

  it('accepts entropy-coded JPEG scans with stuffing and restart markers before EOI', async () => {
    const entropyJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 2, 0xff, 0xda, 0, 2, 1, 0xff, 0, 2, 0xff, 0xd0, 3, 0xff, 0xd9])
    await expect(assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(entropyJpeg, 'image/jpeg') })).resolves.toMatchObject({ assetId: 'asset-1' })
  })

  it('does not return a draft object to another owner', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    await expect(assets.getDraft({ userId: 'owner-2', siteId: 'site-1', assetId: uploaded.assetId })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('streams a draft object only to its owner through the asset route', async () => {
    const worker = createWorker({ requireUser: sessionLookup })
    const upload = new FormData(); upload.set('file', file())
    const created = await worker.fetch(new Request(`${apiOrigin}/v1/sites/site-1/assets`, { method: 'POST', headers: { Origin: appOrigin, Cookie: 'session=owner' }, body: upload }), env, createExecutionContext())
    expect(created.status).toBe(201)
    const { asset } = await created.json()
    const own = await worker.fetch(new Request(`${apiOrigin}/v1/sites/site-1/assets/${asset.assetId}`, { headers: { Origin: appOrigin, Cookie: 'session=owner' } }), env, createExecutionContext())
    const other = await worker.fetch(new Request(`${apiOrigin}/v1/sites/site-1/assets/${asset.assetId}`, { headers: { Origin: appOrigin, Cookie: 'session=other' } }), env, createExecutionContext())
    expect(own.status).toBe(200)
    expect(new Uint8Array(await own.arrayBuffer())).toEqual(png)
    expect(own.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(own.headers.get('Cache-Control')).toBe('private, no-store')
    expect(own.headers.get('Content-Disposition')).toContain(asset.assetId)
    expect(other.status).toBe(404)
  })

  it('copies only referenced assets to an immutable public revision and rewrites image and avatar paths', async () => {
    const image = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const unused = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(gif, 'image/gif') })
    const draft = { siteId: 'site-1', draftRevision: 3, blocks: [
      { id: 'image', type: 'image', content: { storagePath: image.storagePath, url: 'private' } },
      { id: 'profile', type: 'profile', content: { avatarStoragePath: image.storagePath, avatarUrl: 'private' } },
    ] }
    const promoted = await assets.promoteReferenced({ userId: 'owner-1', siteId: 'site-1', draft })
    const url = 'https://links.shibinthomas.com/assets/site-1/3/asset-1'
    expect(promoted.draft.blocks[0].content).toMatchObject({ storagePath: url, url })
    expect(promoted.draft.blocks[1].content).toMatchObject({ avatarStoragePath: url, avatarUrl: url })
    await expect(env.MEDIA.get('public/site-1/3/asset-1')).resolves.toBeTruthy()
    await expect(env.MEDIA.get(`public/site-1/3/${unused.assetId}`)).resolves.toBeNull()
  })

  it('keeps deterministic public objects after an ambiguous D1 publication failure while removing staging', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const draft = { siteId: 'site-1', name: 'Maya', slug: 'site-1-page', templateId: 'blank', draftRevision: 1, blocks: [
      { id: 'link', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com' } },
      { id: 'image', type: 'image', visible: true, content: { storagePath: uploaded.storagePath, url: 'private', alt: 'Portrait' } },
    ], theme: {}, seo: {} }
    const service = createMiniSiteService({ store: { async get() { return draft }, async publish() { return { code: 'revision-conflict' } } }, assets })
    await expect(service.publishMiniSite({ userId: 'owner-1', data: { siteId: 'site-1' } })).rejects.toMatchObject({ code: 'revision_conflict' })
    await expect(env.MEDIA.get('public/site-1/1/asset-1')).resolves.toBeTruthy()
    const staged = await env.MEDIA.list({ prefix: 'staging/site-1/1/' })
    expect(staged.objects).toEqual([])
    await expect(env.MEDIA.get(uploaded.storagePath)).resolves.toBeTruthy()
  })

  it('keeps a same-revision public object when concurrent attempts clean only their own staging keys', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const draft = { siteId: 'site-1', draftRevision: 2, blocks: [{ id: 'image', type: 'image', visible: true, content: { storagePath: uploaded.storagePath, url: 'private' } }], seo: {} }
    let heads = 0; let release
    const gate = new Promise((resolve) => { release = resolve })
    const racingBucket = {
      get: (...args) => env.MEDIA.get(...args), put: (...args) => env.MEDIA.put(...args), delete: (...args) => env.MEDIA.delete(...args), list: (...args) => env.MEDIA.list(...args),
      async head(key) { heads += 1; if (heads === 2) release(); await gate; return env.MEDIA.head(key) },
    }
    const racingAssets = createAssetService({ bucket: racingBucket, db: env.DB, publicOrigin: 'https://links.shibinthomas.com' })
    const [first, second] = await Promise.all([
      racingAssets.promoteReferenced({ userId: 'owner-1', siteId: 'site-1', draft, attemptId: 'attempt-a' }),
      racingAssets.promoteReferenced({ userId: 'owner-1', siteId: 'site-1', draft, attemptId: 'attempt-b' }),
    ])
    await racingAssets.cleanupObsolete({ publicPaths: [...first.publicPaths, ...second.publicPaths] })
    await expect(env.MEDIA.get('public/site-1/2/asset-1')).resolves.toBeTruthy()
    expect((await env.MEDIA.list({ prefix: 'staging/site-1/2/' })).objects).toEqual([])
  })

  it('removes successful-publication staging after the D1 publication completes', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const draft = { siteId: 'site-1', name: 'Maya', slug: 'site-1-page', templateId: 'blank', draftRevision: 4, blocks: [
      { id: 'link', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com' } },
      { id: 'image', type: 'image', visible: true, content: { storagePath: uploaded.storagePath, url: 'private', alt: 'Portrait' } },
    ], theme: {}, seo: {} }
    const service = createMiniSiteService({ store: { async get() { return draft }, async publish() { return { slug: draft.slug, revision: 4 } } }, assets, createId: () => 'attempt-success' })
    await expect(service.publishMiniSite({ userId: 'owner-1', data: { siteId: 'site-1' } })).resolves.toEqual({ slug: 'site-1-page', revision: 4 })
    expect((await env.MEDIA.list({ prefix: 'staging/site-1/4/' })).objects).toEqual([])
    await expect(env.MEDIA.get('public/site-1/4/asset-1')).resolves.toBeTruthy()
  })

  it.each(['staging-read', 'public-put'])('removes staging when %s fails after its put', async (failure) => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const deleted = []
    const bucket = {
      head: (...args) => env.MEDIA.head(...args), list: (...args) => env.MEDIA.list(...args),
      async get(key) { if (failure === 'staging-read' && key.startsWith('staging/')) throw new Error('staging unavailable'); return env.MEDIA.get(key) },
      async put(key, ...args) { if (failure === 'public-put' && key.startsWith('public/')) throw new Error('public unavailable'); return env.MEDIA.put(key, ...args) },
      async delete(key) { deleted.push(key); return env.MEDIA.delete(key) },
    }
    const failing = createAssetService({ bucket, db: env.DB, publicOrigin: 'https://links.shibinthomas.com' })
    const draft = { siteId: 'site-1', draftRevision: 6, blocks: [{ id: 'image', type: 'image', visible: true, content: { storagePath: uploaded.storagePath, url: 'private' } }], seo: {} }
    await expect(failing.promoteReferenced({ userId: 'owner-1', siteId: 'site-1', draft, attemptId: failure })).rejects.toThrow()
    expect(deleted).toEqual([`staging/site-1/6/${failure}/asset-1`])
    await expect(env.MEDIA.get(`staging/site-1/6/${failure}/asset-1`)).resolves.toBeNull()
  })

  it('does not promote hidden or unsupported stale references', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const draft = { siteId: 'site-1', draftRevision: 3, blocks: [
      { id: 'hidden', type: 'image', visible: false, content: { storagePath: 'missing', url: 'private' } },
      { id: 'unknown', type: 'unknown', visible: true, content: { storagePath: 'missing' } },
      { id: 'shown', type: 'image', visible: true, content: { storagePath: uploaded.storagePath, url: 'private', alt: 'A' } },
    ], seo: { socialImagePath: null } }
    await expect(assets.promoteReferenced({ userId: 'owner-1', siteId: 'site-1', draft, attemptId: 'attempt-1' })).resolves.toBeTruthy()
    await expect(env.MEDIA.get('public/site-1/3/asset-1')).resolves.toBeTruthy()
  })

  it('paginates public-object cleanup after the D1 delete has provided its private manifest', async () => {
    const deleted = []; const cursors = []
    const bucket = {
      async list(options) {
        cursors.push(options.cursor ?? null)
        return options.cursor ? { objects: [{ key: 'public/site-1/2/a' }], truncated: false } : { objects: [{ key: 'public/site-1/1/a' }], truncated: true, cursor: 'next' }
      },
      async delete(key) { deleted.push(key) },
    }
    const cleanup = createAssetService({ bucket, db: env.DB, publicOrigin: 'https://links.shibinthomas.com' })
    await cleanup.deleteSiteAssets({ siteId: 'site-1', assetKeys: ['drafts/owner-1/site-1/a'] })
    expect(cursors).toEqual([null, 'next'])
    expect(deleted.sort()).toEqual(['drafts/owner-1/site-1/a', 'public/site-1/1/a', 'public/site-1/2/a'])
  })

  it('removes aged staging objects and unreferenced old public revisions during scheduled cleanup', async () => {
    await env.MEDIA.put('public/site-1/1/old', png)
    await env.MEDIA.put('public/site-1/2/current', png)
    await env.MEDIA.put('staging/site-1/2/old-attempt/image', png)
    await env.DB.prepare(`INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, revision, published_at)
      VALUES ('asset-cleanup', 'site-1', ?1, 'Maya', '', 2, '2026-07-01T00:00:00.000Z')`)
      .bind(JSON.stringify({ schemaVersion: 1, slug: 'asset-cleanup', revision: 2, blocks: [{ id: 'image', type: 'image', visible: true, content: { url: 'https://links.shibinthomas.com/assets/site-1/2/current' } }], theme: {}, seo: {} })).run()

    await assets.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0 })
    await assets.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0 })

    await expect(env.MEDIA.get('public/site-1/1/old')).resolves.toBeNull()
    await expect(env.MEDIA.get('public/site-1/2/current')).resolves.toBeTruthy()
    await expect(env.MEDIA.get('staging/site-1/2/old-attempt/image')).resolves.toBeNull()
  })

  it('bounds cleanup work and continues from its persisted cursor without deleting a newly current revision', async () => {
    for (let number = 0; number < 30; number += 1) await env.MEDIA.put(`staging/site-1/2/attempt/${number}`, png)
    await env.MEDIA.put('public/site-1/4/reused', png)

    await assets.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0, pageSize: 25, deleteBudget: 25 })
    expect((await env.MEDIA.list({ prefix: 'staging/' })).objects).toHaveLength(18)
    await expect(env.DB.prepare("SELECT phase, cursor FROM maintenance_cursors WHERE name = 'public_asset_cleanup_staging'").first()).resolves.toMatchObject({ phase: 'staging', cursor: expect.any(String) })
    await env.DB.prepare(`INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, revision, published_at)
      VALUES ('reused', 'site-1', ?1, '', '', 4, '2026-08-15T00:00:00.000Z')`).bind(JSON.stringify({ schemaVersion: 1, slug: 'reused', revision: 4, blocks: [{ id: 'image', type: 'image', visible: true, content: { url: 'https://links.shibinthomas.com/assets/site-1/4/reused' } }], theme: {}, seo: {} })).run()
    await assets.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0, pageSize: 25, deleteBudget: 25 })
    await assets.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0, pageSize: 25, deleteBudget: 25 })
    await expect(env.MEDIA.get('public/site-1/4/reused')).resolves.toBeTruthy()
    expect((await env.MEDIA.list({ prefix: 'staging/' })).objects).toEqual([])
  })

  it('rechecks the current published revision immediately before a selected public deletion', async () => {
    await env.MEDIA.put('public/site-1/4/race', png)
    await env.DB.prepare(`INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, revision, published_at)
      VALUES ('race', 'site-1', ?1, '', '', 5, '2026-08-15T00:00:00.000Z')`).bind(JSON.stringify({ schemaVersion: 1, slug: 'race', revision: 5, blocks: [], theme: {}, seo: {} })).run()
    const racing = createAssetService({ bucket: env.MEDIA, db: env.DB, publicOrigin: 'https://links.shibinthomas.com', beforePublicDelete: async () => {
      await env.DB.prepare("UPDATE published_sites SET revision = 4 WHERE slug = 'race'").run()
    } })

    await racing.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0 })

    await expect(env.MEDIA.get('public/site-1/4/race')).resolves.toBeTruthy()
  })

  it('advances bounded public and staging cleanup cursors even when public listing never finishes', async () => {
    const calls = []
    const bucket = {
      async list({ prefix, cursor }) {
        calls.push({ prefix, cursor: cursor ?? null })
        if (prefix === 'public/') return { objects: [{ key: `public/site-1/1/${calls.length}`, uploaded: new Date('2026-01-01T00:00:00.000Z') }], truncated: true, cursor: `public-${calls.length}` }
        return { objects: [{ key: 'staging/site-1/1/attempt/a', uploaded: new Date('2026-01-01T00:00:00.000Z') }], truncated: true, cursor: `staging-${calls.length}` }
      },
      async delete() {},
    }
    const cleanup = createAssetService({ bucket, db: env.DB, publicOrigin: 'https://links.shibinthomas.com' })
    await cleanup.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0, pageSize: 2, deleteBudget: 2 })
    expect(calls.map(({ prefix }) => prefix)).toEqual(['public/', 'staging/'])
    await expect(env.DB.prepare("SELECT name, cursor FROM maintenance_cursors WHERE name IN ('public_asset_cleanup_public', 'public_asset_cleanup_staging') ORDER BY name").all()).resolves.toMatchObject({ results: [{ name: 'public_asset_cleanup_public' }, { name: 'public_asset_cleanup_staging' }] })
  })

  it('alternates a one-object cleanup budget so sustained public growth cannot starve staging cleanup', async () => {
    const calls = []
    const bucket = {
      async list({ prefix }) {
        calls.push(prefix)
        return { objects: [{ key: `${prefix}site-1/1/object`, uploaded: new Date('2026-01-01T00:00:00.000Z') }], truncated: true, cursor: `${prefix}next` }
      },
      async delete() {},
    }
    const cleanup = createAssetService({ bucket, db: env.DB, publicOrigin: 'https://links.shibinthomas.com' })

    await cleanup.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0, pageSize: 1, deleteBudget: 1 })
    await cleanup.cleanupObsoletePublicAssets({ now: new Date('2026-08-15T00:00:00.000Z'), graceMilliseconds: 0, pageSize: 1, deleteBudget: 1 })

    expect(calls).toEqual(['public/', 'staging/'])
  })
})
