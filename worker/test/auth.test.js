import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuth } from '../src/auth/createAuth.js'
import { getSession, requireUser } from '../src/auth/session.js'
import { createWorker } from '../src/index.js'
import { verifyTurnstile } from '../src/auth/turnstile.js'
import { resetDatabase } from './support/database.js'

const appOrigin = 'https://app.shibinthomas.com'
const email = 'person@example.com'
const password = 'long-enough-password'

function accountRequest(path, body, cookie) {
  return new Request(`https://api.shibinthomas.com${path}`, {
    method: 'POST',
    headers: {
      Origin: appOrigin,
      'Content-Type': 'application/json',
      'X-Turnstile-Token': '1x0000000000000000000000000000000AA',
      'X-Consent-Version': '2026-07-26',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

function cookieFrom(response) {
  const setCookie = response.headers.get('Set-Cookie')
  return setCookie.match(/^[^;]+/)[0]
}

describe('Better Auth email sessions', () => {
  let deliveries
  let worker

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    deliveries = []
    const emailSender = {
      sendVerification: vi.fn(async (message) => deliveries.push(message)),
      sendPasswordReset: vi.fn(),
    }
    const officialTurnstileTestValidator = (options) => verifyTurnstile({
      ...options,
      fetchImpl: vi.fn().mockResolvedValue(Response.json({
        success: true,
        hostname: 'app.shibinthomas.com',
      })),
    })
    worker = createWorker({
      email: emailSender,
      verifyTurnstile: officialTurnstileTestValidator,
    })
  })

  it('registers with consent, requires verification, creates a cross-subdomain session, and signs out', async () => {
    const signUp = await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )

    expect(signUp.status).toBe(200)
    expect(deliveries).toHaveLength(1)
    const createdUser = await signUp.json()
    await expect(
      env.DB.prepare('SELECT terms_version, privacy_version FROM user_consents WHERE user_id = ?')
        .bind(createdUser.user.id)
        .first(),
    ).resolves.toEqual({ terms_version: '2026-07-26', privacy_version: '2026-07-26' })

    const signIn = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password }),
      env,
      createExecutionContext(),
    )
    expect(signIn.status).toBe(403)
    expect(deliveries).toHaveLength(2)

    const verify = await worker.fetch(
      new Request(deliveries[1].url, { headers: { Origin: appOrigin } }),
      env,
      createExecutionContext(),
    )
    const sessionCookie = cookieFrom(verify)
    expect(verify.status).toBe(302)
    expect(verify.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(verify.headers.get('Set-Cookie')).toContain('Secure')
    expect(verify.headers.get('Set-Cookie')).toContain('Domain=.shibinthomas.com')

    const sessionResponse = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/session', {
        headers: { Origin: appOrigin, Cookie: sessionCookie },
      }),
      env,
      createExecutionContext(),
    )
    expect(sessionResponse.status).toBe(200)
    await expect(sessionResponse.json()).resolves.toMatchObject({
      user: { id: createdUser.user.id, email, name: 'Person', emailVerified: true },
    })

    const auth = createAuth(env, { email: { sendVerification: vi.fn(), sendPasswordReset: vi.fn() } })
    await expect(getSession(auth, new Request('https://api.shibinthomas.com/v1/session', {
      headers: { Cookie: sessionCookie },
    }))).resolves.toMatchObject({ user: { id: createdUser.user.id } })
    await expect(requireUser(auth, new Request('https://api.shibinthomas.com/v1/session', {
      headers: { Cookie: sessionCookie },
    }))).resolves.toEqual({ id: createdUser.user.id, email })

    const signOut = await worker.fetch(
      accountRequest('/auth/sign-out', {}, sessionCookie),
      env,
      createExecutionContext(),
    )
    expect(signOut.status).toBe(200)
    expect(signOut.headers.get('Set-Cookie')).toContain('Max-Age=0')

    const signedOutSession = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/session', {
        headers: { Origin: appOrigin, Cookie: sessionCookie },
      }),
      env,
      createExecutionContext(),
    )
    await expect(signedOutSession.json()).resolves.toEqual({ user: null })
  })

  it('applies CORS to Better Auth errors and rejects missing consent before sign-up', async () => {
    const request = new Request('https://api.shibinthomas.com/auth/sign-up/email', {
      method: 'POST',
      headers: {
        Origin: appOrigin,
        'Content-Type': 'application/json',
        'X-Turnstile-Token': '1x0000000000000000000000000000000AA',
      },
      body: JSON.stringify({ name: 'Person', email, password }),
    })
    const response = await worker.fetch(request, env, createExecutionContext())

    expect(response.status).toBe(400)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(appOrigin)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_consent',
        message: 'Accept the current terms and privacy policy to continue.',
      },
    })
  })
})
