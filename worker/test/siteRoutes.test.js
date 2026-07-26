import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorker } from '../src/index.js'
import { ApiError } from '../src/http/errors.js'
import { resetDatabase } from './support/database.js'

const apiOrigin = 'https://api.shibinthomas.com'
const appOrigin = 'https://app.shibinthomas.com'

function sessionLookup(_auth, request) {
  const session = request.headers.get('Cookie')
  if (session === 'session=owner') return { id: 'owner-1', email: 'owner@example.com' }
  if (session === 'session=other') return { id: 'owner-2', email: 'other@example.com' }
  throw new ApiError('unauthenticated', 'Sign in is required.', 401)
}

function siteInput(overrides = {}) {
  return { name: 'Maya Studio', slug: 'maya-studio', templateId: 'creator', ...overrides }
}

function request(path, { method = 'GET', json, cookie, origin = appOrigin, body, contentType } = {}) {
  const headers = { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }
  if (json !== undefined || contentType) headers['Content-Type'] = contentType ?? 'application/json'
  return new Request(`${apiOrigin}${path}`, {
    method,
    headers,
    body: body ?? (json === undefined ? undefined : JSON.stringify(json)),
  })
}

describe('authenticated mini-site routes', () => {
  let worker

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    worker = createWorker({ requireUser: sessionLookup })
  })

  async function send(path, options) {
    return worker.fetch(request(path, options), env, createExecutionContext())
  }

  function authenticated(path, options = {}) {
    return send(path, { ...options, cookie: 'session=owner' })
  }

  async function createSite(input = siteInput()) {
    const response = await authenticated('/v1/sites', { method: 'POST', json: input })
    expect(response.status).toBe(201)
    return (await response.json()).site
  }

  it('rejects site creation without a session', async () => {
    const response = await send('/v1/sites', { method: 'POST', json: siteInput() })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'unauthenticated' },
    })
  })

  it('creates and lists a site for the current owner', async () => {
    const created = await authenticated('/v1/sites', { method: 'POST', json: siteInput() })
    expect(created.status).toBe(201)

    const list = await authenticated('/v1/sites')
    expect(list.status).toBe(200)
    await expect(list.json()).resolves.toMatchObject({
      sites: [{ name: 'Maya Studio', slug: 'maya-studio' }],
      limit: 5,
    })
  })

  it('reads only sites owned by the current user', async () => {
    const site = await createSite()
    const owned = await authenticated(`/v1/sites/${site.siteId}`)
    const other = await send(`/v1/sites/${site.siteId}`, { cookie: 'session=other' })

    expect(owned.status).toBe(200)
    await expect(owned.json()).resolves.toMatchObject({ site: { siteId: site.siteId } })
    expect(other.status).toBe(404)
    await expect(other.json()).resolves.toMatchObject({ error: { code: 'not_found' } })
  })

  it('rejects malformed site identifiers before querying the store', async () => {
    const response = await authenticated(`/v1/sites/${'a'.repeat(129)}`)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'invalid_argument' } })
  })

  it('duplicates an owned site and rejects a duplicate public slug', async () => {
    const source = await createSite()
    const duplicate = await authenticated(`/v1/sites/${source.siteId}/duplicate`, {
      method: 'POST',
      json: siteInput({ name: 'Maya Copy', slug: 'maya-copy' }),
    })
    const collision = await authenticated('/v1/sites', {
      method: 'POST', json: siteInput({ name: 'Collision', slug: 'maya-copy' }),
    })

    expect(duplicate.status).toBe(201)
    await expect(duplicate.json()).resolves.toMatchObject({ site: { name: 'Maya Copy', slug: 'maya-copy' } })
    expect(collision.status).toBe(409)
    await expect(collision.json()).resolves.toMatchObject({ error: { code: 'slug_taken' } })
  })

  it('saves an owned draft once and reports stale revisions as conflicts', async () => {
    const site = await createSite()
    const draft = {
      name: 'Maya Updated',
      templateId: site.templateId,
      blocks: [{
        id: 'link-1', type: 'link', visible: true,
        content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '' },
      }],
      theme: {},
      seo: { title: 'Maya Updated', description: '', socialImagePath: null },
    }
    const saved = await authenticated(`/v1/sites/${site.siteId}`, {
      method: 'PUT', json: { expectedRevision: site.draftRevision, draft },
    })
    const stale = await authenticated(`/v1/sites/${site.siteId}`, {
      method: 'PUT', json: { expectedRevision: site.draftRevision, draft },
    })

    expect(saved.status).toBe(200)
    await expect(saved.json()).resolves.toMatchObject({ site: { name: 'Maya Updated', draftRevision: site.draftRevision + 1 } })
    expect(stale.status).toBe(409)
    await expect(stale.json()).resolves.toMatchObject({ error: { code: 'revision_conflict' } })
  })

  it('changes a slug only when it remains globally available', async () => {
    const first = await createSite()
    await createSite(siteInput({ name: 'Second', slug: 'second-site' }))
    const changed = await authenticated(`/v1/sites/${first.siteId}/slug`, {
      method: 'PUT', json: { slug: 'maya-renamed' },
    })
    const collision = await authenticated(`/v1/sites/${first.siteId}/slug`, {
      method: 'PUT', json: { slug: 'second-site' },
    })

    expect(changed.status).toBe(200)
    await expect(changed.json()).resolves.toMatchObject({ site: { slug: 'maya-renamed' } })
    expect(collision.status).toBe(409)
    await expect(collision.json()).resolves.toMatchObject({ error: { code: 'slug_taken' } })
  })

  it('publishes and unpublishes an owned valid draft', async () => {
    const site = await createSite()
    const draft = {
      name: site.name,
      templateId: site.templateId,
      blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '' } }],
      theme: {}, seo: { title: site.name, description: '', socialImagePath: null },
    }
    const saved = await authenticated(`/v1/sites/${site.siteId}`, {
      method: 'PUT', json: { expectedRevision: site.draftRevision, draft },
    })
    expect(saved.status).toBe(200)
    const published = await authenticated(`/v1/sites/${site.siteId}/publish`, { method: 'POST', json: {} })
    const unpublished = await authenticated(`/v1/sites/${site.siteId}/unpublish`, { method: 'POST', json: {} })

    expect(published.status).toBe(200)
    await expect(published.json()).resolves.toMatchObject({ publication: { slug: 'maya-studio', revision: 2 } })
    expect(unpublished.status).toBe(200)
    await expect(unpublished.json()).resolves.toMatchObject({ publication: { slug: 'maya-studio' } })
  })

  it('requires exact name confirmation before deleting an owned site', async () => {
    const site = await createSite()
    const wrong = await authenticated(`/v1/sites/${site.siteId}`, {
      method: 'DELETE', json: { confirmationName: 'Wrong name' },
    })
    const deleted = await authenticated(`/v1/sites/${site.siteId}`, {
      method: 'DELETE', json: { confirmationName: 'Maya Studio' },
    })

    expect(wrong.status).toBe(412)
    await expect(wrong.json()).resolves.toMatchObject({ error: { code: 'name_mismatch' } })
    expect(deleted.status).toBe(200)
    await expect(deleted.json()).resolves.toEqual({ deleted: true })
  })

  it('returns analytics only to the site owner', async () => {
    const site = await createSite()
    const owner = await authenticated(`/v1/sites/${site.siteId}/analytics`)
    const other = await send(`/v1/sites/${site.siteId}/analytics`, { cookie: 'session=other' })

    expect(owner.status).toBe(200)
    await expect(owner.json()).resolves.toEqual({
      analytics: { summary: { totalViews: 0, totalClicks: 0 }, days: [], linkClicks: {} },
    })
    expect(other.status).toBe(404)
    await expect(other.json()).resolves.toMatchObject({ error: { code: 'not_found' } })
  })

  it('returns the stable site-limit error for a sixth site', async () => {
    for (let number = 1; number <= 5; number += 1) {
      await createSite(siteInput({ name: `Site ${number}`, slug: `site-${number}` }))
    }
    const response = await authenticated('/v1/sites', {
      method: 'POST', json: siteInput({ name: 'Site Six', slug: 'site-six' }),
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'site_limit' } })
  })

  it('rejects JSON larger than one MiB before parsing it', async () => {
    const response = await authenticated('/v1/sites', {
      method: 'POST',
      body: `{${'x'.repeat(1024 * 1024 + 1)}`,
      contentType: 'application/json',
    })

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'request_too_large' } })
  })

  it('keeps management responses compatible with exact-origin credentialed CORS', async () => {
    const accepted = await authenticated('/v1/sites', { method: 'POST', json: siteInput(), origin: appOrigin })
    const rejected = await authenticated('/v1/sites', {
      method: 'POST', json: siteInput({ name: 'Other', slug: 'other-site' }), origin: 'https://app.shibinthomas.com.attacker.example',
    })

    expect(accepted.headers.get('Access-Control-Allow-Origin')).toBe(appOrigin)
    expect(accepted.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(rejected.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it.each([
    'https://attacker.example',
    'https://evil.shibinthomas.com',
    'https://app.shibinthomas.com.attacker.example',
  ])('rejects a mutating management request from %s before D1 changes', async (origin) => {
    const response = await authenticated('/v1/sites', {
      method: 'POST', json: siteInput(), origin,
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'invalid_origin' } })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM mini_sites').first()).resolves.toEqual({ count: 0 })
  })

  it('requires application/json for a create request before D1 changes', async () => {
    const response = await authenticated('/v1/sites', {
      method: 'POST', body: JSON.stringify(siteInput()), contentType: 'text/plain',
    })

    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'unsupported_media_type' } })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM mini_sites').first()).resolves.toEqual({ count: 0 })
  })

  it('requires application/json before a bodyless publish or unpublish can change a site', async () => {
    const site = await createSite()
    const responses = await Promise.all([
      authenticated(`/v1/sites/${site.siteId}/publish`, { method: 'POST' }),
      authenticated(`/v1/sites/${site.siteId}/unpublish`, { method: 'POST' }),
    ])

    for (const response of responses) {
      expect(response.status).toBe(415)
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'unsupported_media_type' } })
    }
    await expect(env.DB.prepare('SELECT status, published_at FROM mini_sites WHERE id = ?').bind(site.siteId).first()).resolves.toEqual({
      status: 'draft', published_at: null,
    })
  })

  it.each([
    ['publish', ''],
    ['unpublish', ''],
    ['publish', ' \n\t '],
    ['unpublish', ' \n\t '],
  ])('rejects an empty JSON %s request before changing the site', async (action, body) => {
    const site = await createSite()
    const save = await authenticated(`/v1/sites/${site.siteId}`, {
      method: 'PUT',
      json: {
        expectedRevision: site.draftRevision,
        draft: {
          name: site.name, templateId: site.templateId,
          blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '' } }],
          theme: {}, seo: { title: site.name, description: '', socialImagePath: null },
        },
      },
    })
    expect(save.status).toBe(200)
    const response = await authenticated(`/v1/sites/${site.siteId}/${action}`, {
      method: 'POST', body, contentType: 'application/json',
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'invalid_argument' } })
    await expect(env.DB.prepare('SELECT status, published_at FROM mini_sites WHERE id = ?').bind(site.siteId).first()).resolves.toEqual({
      status: 'draft', published_at: null,
    })
  })

  it('denies signed-out item routes without changing the owned site', async () => {
    const site = await createSite()
    const draft = {
      name: 'Changed', templateId: site.templateId,
      blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '' } }],
      theme: {}, seo: { title: 'Changed', description: '', socialImagePath: null },
    }
    const operations = [
      ['GET', `/v1/sites/${site.siteId}`],
      ['PUT', `/v1/sites/${site.siteId}`, { expectedRevision: site.draftRevision, draft }],
      ['POST', `/v1/sites/${site.siteId}/duplicate`, siteInput({ name: 'Copy', slug: 'maya-copy' })],
      ['PUT', `/v1/sites/${site.siteId}/slug`, { slug: 'maya-renamed' }],
      ['POST', `/v1/sites/${site.siteId}/publish`, {}],
      ['POST', `/v1/sites/${site.siteId}/unpublish`, {}],
      ['DELETE', `/v1/sites/${site.siteId}`, { confirmationName: site.name }],
      ['GET', `/v1/sites/${site.siteId}/analytics`],
    ]

    const before = await env.DB.prepare('SELECT name, slug, status, draft_revision FROM mini_sites WHERE id = ?').bind(site.siteId).first()
    for (const [method, path, json] of operations) {
      const response = await send(path, { method, ...(json === undefined ? {} : { json }) })
      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'unauthenticated' } })
      await expect(env.DB.prepare('SELECT name, slug, status, draft_revision FROM mini_sites WHERE id = ?').bind(site.siteId).first()).resolves.toEqual(before)
    }
  })

  it("denies cross-owner item mutations without changing the owner's site", async () => {
    const site = await createSite()
    const draft = {
      name: 'Changed', templateId: site.templateId,
      blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '' } }],
      theme: {}, seo: { title: 'Changed', description: '', socialImagePath: null },
    }
    const operations = [
      ['PUT', `/v1/sites/${site.siteId}`, { expectedRevision: site.draftRevision, draft }],
      ['POST', `/v1/sites/${site.siteId}/duplicate`, siteInput({ name: 'Copy', slug: 'maya-copy' })],
      ['PUT', `/v1/sites/${site.siteId}/slug`, { slug: 'maya-renamed' }],
      ['POST', `/v1/sites/${site.siteId}/publish`, {}],
      ['POST', `/v1/sites/${site.siteId}/unpublish`, {}],
      ['DELETE', `/v1/sites/${site.siteId}`, { confirmationName: site.name }],
    ]

    const before = await env.DB.prepare('SELECT name, slug, status, draft_revision FROM mini_sites WHERE id = ?').bind(site.siteId).first()
    for (const [method, path, json] of operations) {
      const response = await send(path, { method, json, cookie: 'session=other' })
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'not_found' } })
      await expect(env.DB.prepare('SELECT name, slug, status, draft_revision FROM mini_sites WHERE id = ?').bind(site.siteId).first()).resolves.toEqual(before)
    }
  })

  it('does not leak D1 failures through management responses', async () => {
    await env.DB.prepare('DROP TABLE mini_sites').run()
    const response = await authenticated('/v1/sites', { method: 'POST', json: siteInput() })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'internal_error', message: 'An unexpected error occurred.' },
    })
  })
})
