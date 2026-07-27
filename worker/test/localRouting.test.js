import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorker } from '../src/index.js'
import { resetDatabase } from './support/database.js'

const devOrigin = 'http://localhost:5173'
const localRuntime = { ...env, DEV_ORIGIN: devOrigin, LOCAL_API_ORIGIN: 'http://localhost:8787' }

function request(host, path, options = {}) {
  const headers = new Headers(options.headers)
  if (!headers.has('Origin')) headers.set('Origin', devOrigin)
  return new Request(`http://${host}${path}`, { ...options, headers })
}

function cookieFrom(response) {
  return response.headers.get('Set-Cookie').match(/^[^;]+/)[0]
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

  it('completes local email verification and host-only session authentication without a requireUser stub', async () => {
    const deliveries = []
    const authWorker = createWorker({
      verifyTurnstile: async () => undefined,
      email: {
        sendVerification: async (message) => deliveries.push(message),
        sendPasswordReset: async () => undefined,
      },
    })
    const signUp = await authWorker.fetch(request('localhost:8787', '/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Turnstile-Token': 'test-token',
        'X-Consent-Version': '2026-07-26',
      },
      body: JSON.stringify({ name: 'Verified Local', email: 'verified-local@example.com', password: 'long-enough-password' }),
    }), localRuntime, createExecutionContext())

    expect(signUp.status).toBe(200)
    expect(deliveries).toHaveLength(1)
    expect(new URL(deliveries[0].url).origin).toBe('http://localhost:8787')
    expect(new URL(deliveries[0].url).searchParams.get('callbackURL')).toBe(`${devOrigin}/login`)

    const verification = await authWorker.fetch(new Request(deliveries[0].url, {
      headers: { Origin: devOrigin },
    }), localRuntime, createExecutionContext())
    const verificationCookie = cookieFrom(verification)
    expect(verification.status).toBe(302)
    expect(new URL(verification.headers.get('Location')).origin).toBe(devOrigin)
    expect(verification.headers.get('Set-Cookie')).not.toContain('Domain=.shibinthomas.com')
    expect(verification.headers.get('Set-Cookie')).not.toContain('Secure')

    const signIn = await authWorker.fetch(request('localhost:8787', '/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Turnstile-Token': 'test-token' },
      body: JSON.stringify({ email: 'verified-local@example.com', password: 'long-enough-password' }),
    }), localRuntime, createExecutionContext())
    const sessionCookie = cookieFrom(signIn)
    expect(signIn.status).toBe(200)
    expect(signIn.headers.get('Set-Cookie')).not.toContain('Domain=.shibinthomas.com')
    expect(signIn.headers.get('Set-Cookie')).not.toContain('Secure')

    const session = await authWorker.fetch(request('localhost:8787', '/v1/session', {
      headers: { Cookie: sessionCookie },
    }), localRuntime, createExecutionContext())
    const site = await authWorker.fetch(request('localhost:8787', '/v1/sites', {
      method: 'POST',
      headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Verified Local Site', slug: 'verified-local-site', templateId: 'blank' }),
    }), localRuntime, createExecutionContext())

    await expect(session.json()).resolves.toMatchObject({ user: { email: 'verified-local@example.com' } })
    expect(site.status).toBe(201)
    expect(verificationCookie).toContain('better-auth')
  })

  it('captures verification links only in an explicitly enabled local development runtime', async () => {
    const capturedRuntime = { ...localRuntime, LOCAL_EMAIL_CAPTURE: 'true' }
    const captureWorker = createWorker({ verifyTurnstile: async () => undefined })

    const clear = await captureWorker.fetch(request('localhost:8787', '/v1/local-test/email-deliveries', {
      method: 'DELETE',
    }), capturedRuntime, createExecutionContext())
    const signUp = await captureWorker.fetch(request('localhost:8787', '/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Turnstile-Token': 'test-token',
        'X-Consent-Version': '2026-07-26',
      },
      body: JSON.stringify({ name: 'Captured Local', email: 'captured-local@example.com', password: 'long-enough-password' }),
    }), capturedRuntime, createExecutionContext())
    const deliveries = await captureWorker.fetch(request('localhost:8787', '/v1/local-test/email-deliveries'), capturedRuntime, createExecutionContext())

    expect(clear.status).toBe(204)
    expect(signUp.status).toBe(200)
    expect(deliveries.status).toBe(200)
    await expect(deliveries.json()).resolves.toEqual({
      deliveries: [expect.objectContaining({
        type: 'verification',
        email: 'captured-local@example.com',
        url: expect.stringContaining('http://localhost:8787/auth/verify-email?token='),
      })],
    })
  })

  it('keeps explicitly configured local authentication helpers available when Wrangler rewrites a custom-domain request URL', async () => {
    const capturedRuntime = {
      ...env,
      DEV_ORIGIN: devOrigin,
      LOCAL_API_ORIGIN: 'http://127.0.0.1:8787',
      LOCAL_EMAIL_CAPTURE: 'true',
    }
    const clear = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/local-test/email-deliveries', { method: 'DELETE', headers: { Origin: devOrigin } }),
      capturedRuntime,
      createExecutionContext(),
    )
    const response = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/local-test/email-deliveries', { headers: { Origin: devOrigin } }),
      capturedRuntime,
      createExecutionContext(),
    )

    expect(clear.status).toBe(204)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ deliveries: [] })
  })

  it('does not expose local helpers or local origins when a deployed request carries Cloudflare metadata', async () => {
    const attackedRuntime = { ...localRuntime, LOCAL_EMAIL_CAPTURE: 'true' }
    const deliveries = []
    const attackWorker = createWorker({
      verifyTurnstile: async () => undefined,
      email: { sendVerification: async (message) => deliveries.push(message), sendPasswordReset: async (message) => deliveries.push(message) },
    })
    const headers = { Origin: devOrigin, 'CF-Ray': 'attack-FRA', 'Content-Type': 'application/json', 'X-Turnstile-Token': 'test-token', 'X-Consent-Version': '2026-07-26' }
    const capture = await attackWorker.fetch(new Request('https://api.shibinthomas.com/v1/local-test/email-deliveries', { headers }), attackedRuntime, createExecutionContext())
    const signUp = await attackWorker.fetch(new Request('https://api.shibinthomas.com/auth/sign-up/email', { method: 'POST', headers, body: JSON.stringify({ name: 'Attack', email: 'attack@example.com', password: 'long-enough-password' }) }), attackedRuntime, createExecutionContext())
    const reset = await attackWorker.fetch(new Request('https://api.shibinthomas.com/auth/request-password-reset', { method: 'POST', headers, body: JSON.stringify({ email: 'attack@example.com' }) }), attackedRuntime, createExecutionContext())

    expect(capture.status).toBe(404)
    expect(signUp.status).toBe(403)
    expect(reset.status).toBe(403)
    expect(deliveries).toEqual([])
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
