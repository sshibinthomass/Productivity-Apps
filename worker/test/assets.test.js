import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAssetService } from '../src/assets/service.js'
import { createWorker } from '../src/index.js'
import { createMiniSiteService } from '../src/sites/service.js'
import { resetDatabase } from './support/database.js'
import { ApiError } from '../src/http/errors.js'

const apiOrigin = 'https://api.shibinthomas.com'
const appOrigin = 'https://app.shibinthomas.com'
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1])
const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1])
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1])

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
    ['image/png', png], ['image/jpeg', jpeg], ['image/gif', gif], ['image/webp', webp],
  ])('accepts the %s signature only when it matches the declared MIME type', async (type, bytes) => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(bytes, type) })
    expect(uploaded).toMatchObject({ assetId: expect.any(String), storagePath: `drafts/owner-1/site-1/${uploaded.assetId}`, url: `${apiOrigin}/v1/sites/site-1/assets/${uploaded.assetId}` })
  })

  it('rejects a PNG label with non-PNG bytes', async () => {
    await expect(assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file(jpeg, 'image/png') })).rejects.toMatchObject({ code: 'invalid_asset' })
  })

  it('uses a server-generated R2 key and writes D1 metadata after the object exists', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    expect(uploaded.storagePath).toBe('drafts/owner-1/site-1/asset-1')
    await expect(env.MEDIA.get(uploaded.storagePath)).resolves.toBeTruthy()
    await expect(env.DB.prepare('SELECT object_key, content_type FROM site_assets WHERE id = ?').bind(uploaded.assetId).first()).resolves.toEqual({ object_key: uploaded.storagePath, content_type: 'image/png' })
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

  it('removes only new promotion objects when D1 publication fails', async () => {
    const uploaded = await assets.uploadDraft({ userId: 'owner-1', siteId: 'site-1', file: file() })
    const draft = { siteId: 'site-1', name: 'Maya', slug: 'site-1-page', templateId: 'blank', draftRevision: 1, blocks: [
      { id: 'link', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com' } },
      { id: 'image', type: 'image', visible: true, content: { storagePath: uploaded.storagePath, url: 'private', alt: 'Portrait' } },
    ], theme: {}, seo: {} }
    const service = createMiniSiteService({ store: { async get() { return draft }, async publish() { return { code: 'revision-conflict' } } }, assets })
    await expect(service.publishMiniSite({ userId: 'owner-1', data: { siteId: 'site-1' } })).rejects.toMatchObject({ code: 'revision_conflict' })
    await expect(env.MEDIA.get('public/site-1/1/asset-1')).resolves.toBeNull()
    await expect(env.MEDIA.get(uploaded.storagePath)).resolves.toBeTruthy()
  })
})
