import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorker } from '../src/index.js'
import { resetDatabase } from './support/database.js'

const devOrigin = 'http://localhost:5173'
const localRuntime = { ...env, DEV_ORIGIN: devOrigin }

function request(host, path, options = {}) {
  const headers = new Headers(options.headers)
  if (!headers.has('Origin')) headers.set('Origin', devOrigin)
  return new Request(`http://${host}${path}`, { ...options, headers })
}

async function seedPublishedSite() {
  const snapshot = {
    schemaVersion: 1,
    slug: 'maya-links',
    revision: 3,
    blocks: [],
    theme: {},
    seo: { title: 'Maya', description: 'A public page', socialImageUrl: null },
  }
  await env.DB.prepare(`INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, social_image_url, revision, published_at)
    VALUES (?1, ?2, ?3, ?4, ?5, NULL, 3, '2026-07-26T00:00:00.000Z')`)
    .bind('maya-links', 'local-site', JSON.stringify(snapshot), 'Maya', 'A public page').run()
}

describe('explicit local Worker routing', () => {
  let worker

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    worker = createWorker({
      requireUser: async () => ({ id: 'local-owner', email: 'local@example.com' }),
      verifyTurnstile: async () => undefined,
      email: { sendVerification: async () => undefined, sendPasswordReset: async () => undefined },
    })
  })

  it('routes local auth, session, and site requests to the API with exact development CORS', async () => {
    const signUp = await worker.fetch(request('localhost:8787', '/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Turnstile-Token': 'test-token',
        'X-Consent-Version': '2026-07-26',
      },
      body: JSON.stringify({ name: 'Local Person', email: 'local@example.com', password: 'long-enough-password' }),
    }), localRuntime, createExecutionContext())
    const session = await worker.fetch(request('localhost:8787', '/v1/session'), localRuntime, createExecutionContext())
    const site = await worker.fetch(request('localhost:8787', '/v1/sites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Local Site', slug: 'local-site', templateId: 'blank' }),
    }), localRuntime, createExecutionContext())

    expect(signUp.status).toBe(200)
    expect(signUp.headers.get('Access-Control-Allow-Origin')).toBe(devOrigin)
    expect(session.status).toBe(200)
    await expect(session.json()).resolves.toEqual({ user: null })
    expect(site.status).toBe(201)
    await expect(site.json()).resolves.toMatchObject({ site: { slug: 'local-site' } })
  })

  it('routes local public slugs, public JSON, and public assets to the public host behavior', async () => {
    await seedPublishedSite()
    await env.MEDIA.put('public/local-site/3/avatar', new Uint8Array([137, 80, 78, 71]), {
      httpMetadata: { contentType: 'image/png' },
    })

    const page = await worker.fetch(request('localhost:8787', '/maya-links'), localRuntime, createExecutionContext())
    const json = await worker.fetch(request('localhost:8787', '/v1/public/sites/maya-links'), localRuntime, createExecutionContext())
    const asset = await worker.fetch(request('localhost:8787', '/assets/local-site/3/avatar'), localRuntime, createExecutionContext())

    expect(page.status).toBe(200)
    expect(await page.text()).toContain('id="mini-site-bootstrap"')
    expect(json.status).toBe(200)
    await expect(json.json()).resolves.toMatchObject({ site: { slug: 'maya-links' } })
    expect(asset.status).toBe(200)
    expect(asset.headers.get('Content-Type')).toBe('image/png')
  })

  it.each(['localhost:8787', '127.0.0.1:8787', '[::1]:8787'])('accepts the explicit local runtime host %s', async (host) => {
    const response = await worker.fetch(request(host, '/v1/health'), localRuntime, createExecutionContext())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('does not expose a local runtime without an explicit development origin', async () => {
    const response = await worker.fetch(request('localhost:8787', '/v1/health'), env, createExecutionContext())

    expect(response.status).toBe(404)
  })

  it.each([
    'api.shibinthomas.com.attacker.example',
    'links.shibinthomas.com.attacker.example',
    'localhost.attacker.example',
  ])('denies production lookalike host %s even when local development is configured', async (host) => {
    const response = await worker.fetch(request(host, '/v1/health'), localRuntime, createExecutionContext())

    expect(response.status).toBe(404)
  })
})
