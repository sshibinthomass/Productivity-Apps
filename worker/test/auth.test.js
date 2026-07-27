import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuth } from '../src/auth/createAuth.js'
import { getSession, requireUser } from '../src/auth/session.js'
import { createWorker } from '../src/index.js'
import { verifyTurnstile } from '../src/auth/turnstile.js'
import { ApiError } from '../src/http/errors.js'
import { resetDatabase } from './support/database.js'

const appOrigin = 'https://app.shibinthomas.com'
const devOrigin = 'http://localhost:5173'
const email = 'person@example.com'
const password = 'long-enough-password'
const replacementPassword = 'replacement-password'

function accountRequest(path, body, options = {}) {
  const {
    cookie,
    origin = appOrigin,
    token = '1x0000000000000000000000000000000AA',
    consent = '2026-07-26',
  } = options
  return new Request(`https://api.shibinthomas.com${path}`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-Turnstile-Token': token,
      'X-Consent-Version': consent,
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
  let resetDeliveries
  let worker
  let emailSender

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    deliveries = []
    resetDeliveries = []
    emailSender = {
      sendVerification: vi.fn(async (message) => deliveries.push(message)),
      sendPasswordReset: vi.fn(async (message) => resetDeliveries.push(message)),
    }
    const officialTurnstileTestValidator = (options) => verifyTurnstile({
      ...options,
      fetchImpl: vi.fn().mockResolvedValue(Response.json({
        success: true,
        hostname: options.hostname,
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
    expect(verify.status).toBe(302)
    expect(verify.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(verify.headers.get('Set-Cookie')).toContain('Secure')
    expect(verify.headers.get('Set-Cookie')).toContain('Domain=.shibinthomas.com')

    const verifiedSignIn = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password }),
      env,
      createExecutionContext(),
    )
    const signedInBody = await verifiedSignIn.json()
    const signedInCookie = cookieFrom(verifiedSignIn)
    expect(verifiedSignIn.status).toBe(200)
    expect(signedInBody).toEqual({
      user: expect.objectContaining({ id: createdUser.user.id, email, emailVerified: true }),
    })
    expect(JSON.stringify(signedInBody)).not.toMatch(/token|session|account/i)
    expect(verifiedSignIn.headers.get('Set-Cookie')).toContain('HttpOnly')

    const sessionResponse = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/session', {
        headers: { Origin: appOrigin, Cookie: signedInCookie },
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
      headers: { Cookie: signedInCookie },
    }))).resolves.toMatchObject({ user: { id: createdUser.user.id } })
    await expect(requireUser(auth, new Request('https://api.shibinthomas.com/v1/session', {
      headers: { Cookie: signedInCookie },
    }))).resolves.toEqual({ id: createdUser.user.id, email })

    const signOut = await worker.fetch(
      accountRequest('/auth/sign-out', {}, { cookie: signedInCookie }),
      env,
      createExecutionContext(),
    )
    expect(signOut.status).toBe(200)
    expect(signOut.headers.get('Set-Cookie')).toContain('Max-Age=0')

    const signedOutSession = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/session', {
        headers: { Origin: appOrigin, Cookie: signedInCookie },
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

  it('rejects failed Turnstile validation before Better Auth creates an account', async () => {
    const rejectedWorker = createWorker({
      email: emailSender,
      verifyTurnstile: async () => {
        throw new ApiError('invalid_challenge', 'Complete the security check and try again.', 400)
      },
    })

    const response = await rejectedWorker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )

    expect(response.status).toBe(400)
    await expect(env.DB.prepare('SELECT id FROM "user" WHERE email = ?').bind(email).first()).resolves.toBeNull()
  })

  it('enforces the sign-up route limit before the sixth attempt', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await worker.fetch(
        accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
        env,
        createExecutionContext(),
      )
    }

    const response = await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )

    expect(response.status).toBe(429)
  })

  it('keeps duplicate sign-up responses generic while withholding token fields', async () => {
    const first = await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )
    const duplicate = await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )

    expect(first.status).toBe(200)
    expect(duplicate.status).toBe(200)
    expect(Object.keys(await first.json())).toEqual(Object.keys(await duplicate.json()))
  })

  it('delivers resend verification for an unverified real user and keeps unknown reset requests generic', async () => {
    await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )
    const resend = await worker.fetch(
      accountRequest('/auth/send-verification-email', { email }),
      env,
      createExecutionContext(),
    )
    const reset = await worker.fetch(
      accountRequest('/auth/request-password-reset', { email: 'missing@example.com' }),
      env,
      createExecutionContext(),
    )

    expect(resend.status).toBe(200)
    expect(reset.status).toBe(200)
    await expect(reset.json()).resolves.toEqual({ status: true })
    expect(emailSender.sendVerification).toHaveBeenCalledTimes(2)
    expect(emailSender.sendPasswordReset).not.toHaveBeenCalled()
  })

  it('enforces independent sign-in, resend-verification, and reset-request limits', async () => {
    await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )
    await worker.fetch(
      new Request(deliveries[0].url, { headers: { Origin: appOrigin } }),
      env,
      createExecutionContext(),
    )

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await worker.fetch(
        accountRequest('/auth/sign-in/email', { email, password: 'incorrect-password' }),
        env,
        createExecutionContext(),
      )
      expect(response.status).toBe(401)
    }
    const blockedSignIn = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password: 'incorrect-password' }),
      env,
      createExecutionContext(),
    )
    expect(blockedSignIn.status).toBe(429)

    const unverifiedEmail = 'unverified@example.com'
    await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Unverified', email: unverifiedEmail, password }),
      env,
      createExecutionContext(),
    )
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await worker.fetch(
        accountRequest('/auth/send-verification-email', { email: unverifiedEmail }),
        env,
        createExecutionContext(),
      )
      expect(response.status).toBe(200)
    }
    const blockedResend = await worker.fetch(
      accountRequest('/auth/send-verification-email', { email: unverifiedEmail }),
      env,
      createExecutionContext(),
    )
    expect(blockedResend.status).toBe(429)
    expect(emailSender.sendVerification).toHaveBeenCalledTimes(5)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await worker.fetch(
        accountRequest('/auth/request-password-reset', { email }),
        env,
        createExecutionContext(),
      )
      expect(response.status).toBe(200)
    }
    const blockedReset = await worker.fetch(
      accountRequest('/auth/request-password-reset', { email }),
      env,
      createExecutionContext(),
    )
    expect(blockedReset.status).toBe(429)
    expect(emailSender.sendPasswordReset).toHaveBeenCalledTimes(3)
  })

  it('completes Better Auth password reset through its callback route without exposing a token in JSON', async () => {
    await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )
    await worker.fetch(
      new Request(deliveries[0].url, { headers: { Origin: appOrigin } }),
      env,
      createExecutionContext(),
    )
    const requested = await worker.fetch(
      accountRequest('/auth/request-password-reset', {
        email,
        redirectTo: `${appOrigin}/reset-password`,
      }),
      env,
      createExecutionContext(),
    )
    expect(requested.status).toBe(200)
    expect(resetDeliveries).toHaveLength(1)

    const resetLink = new URL(resetDeliveries[0].url)
    const callback = await worker.fetch(
      new Request(resetLink, { headers: { Origin: appOrigin } }),
      env,
      createExecutionContext(),
    )
    const applicationResetUrl = new URL(callback.headers.get('Location'))
    const token = applicationResetUrl.searchParams.get('token')
    expect(callback.status).toBe(302)
    expect(applicationResetUrl.origin).toBe(appOrigin)
    expect(token).toEqual(expect.any(String))

    const completed = await worker.fetch(
      accountRequest('/auth/reset-password', { token, newPassword: replacementPassword }),
      env,
      createExecutionContext(),
    )
    expect(completed.status).toBe(200)
    await expect(completed.json()).resolves.toEqual({ status: true })

    const oldPassword = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password }),
      env,
      createExecutionContext(),
    )
    expect(oldPassword.status).toBe(401)

    const newPassword = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password: replacementPassword }),
      env,
      createExecutionContext(),
    )
    const body = await newPassword.json()
    expect(newPassword.status).toBe(200)
    expect(body).toEqual({ user: expect.objectContaining({ email }) })
    expect(JSON.stringify(body)).not.toMatch(/token|session|account/i)
    expect(newPassword.headers.get('Set-Cookie')).toContain('HttpOnly')
  })

  it('changes a signed-in password without exposing session internals', async () => {
    await worker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )
    await worker.fetch(
      new Request(deliveries[0].url, { headers: { Origin: appOrigin } }),
      env,
      createExecutionContext(),
    )
    const signedIn = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password }),
      env,
      createExecutionContext(),
    )
    const signedInCookie = cookieFrom(signedIn)

    const signedOutChange = await worker.fetch(
      accountRequest('/auth/change-password', {
        currentPassword: password,
        newPassword: replacementPassword,
      }),
      env,
      createExecutionContext(),
    )
    expect(signedOutChange.status).toBe(401)

    const changed = await worker.fetch(
      accountRequest('/auth/change-password', {
        currentPassword: password,
        newPassword: replacementPassword,
      }, { cookie: signedInCookie }),
      env,
      createExecutionContext(),
    )
    expect(changed.status).toBe(200)
    const changedBody = await changed.json()
    expect(changedBody).toEqual({ status: true })
    expect(JSON.stringify(changedBody)).not.toMatch(/token|session|account/i)

    const oldPassword = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password }),
      env,
      createExecutionContext(),
    )
    expect(oldPassword.status).toBe(401)

    const newPassword = await worker.fetch(
      accountRequest('/auth/sign-in/email', { email, password: replacementPassword }),
      env,
      createExecutionContext(),
    )
    expect(newPassword.status).toBe(200)
  })

  it('does not expose Better Auth session introspection routes', async () => {
    const responses = await Promise.all(['/auth/get-session', '/auth/list-sessions'].map((path) => (
      worker.fetch(
        new Request(`https://api.shibinthomas.com${path}`, { headers: { Origin: appOrigin } }),
        env,
        createExecutionContext(),
      )
    )))

    for (const response of responses) {
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({
        error: { code: 'not_found', message: 'Not found.' },
      })
    }
  })

  it('uses only an exact configured development origin for CORS and Turnstile', async () => {
    const developmentEnv = { ...env, DEV_ORIGIN: devOrigin, LOCAL_API_ORIGIN: 'http://localhost:8787' }
    const accepted = await worker.fetch(
      accountRequest('/auth/request-password-reset', { email: 'missing@example.com' }, { origin: devOrigin }),
      developmentEnv,
      createExecutionContext(),
    )
    const lookalike = await worker.fetch(
      accountRequest('/auth/request-password-reset', { email: 'missing@example.com' }, {
        origin: 'http://localhost:5173.attacker.example',
      }),
      developmentEnv,
      createExecutionContext(),
    )

    expect(accepted.headers.get('Access-Control-Allow-Origin')).toBe(devOrigin)
    expect(lookalike.status).toBe(403)
    expect(lookalike.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('does not send verification email or allow verification until consent persistence succeeds', async () => {
    let failConsent = true
    const consentWorker = createWorker({
      email: emailSender,
      verifyTurnstile: async () => undefined,
      recordConsent: async ({ db, userId }) => {
        if (failConsent) throw new Error('D1 consent write failed')
        await db.prepare(
          `INSERT INTO user_consents (user_id, terms_version, privacy_version, accepted_at)
           VALUES (?, '2026-07-26', '2026-07-26', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
        ).bind(userId).run()
      },
    })
    const first = await consentWorker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )

    expect(first.status).toBe(500)
    expect(deliveries).toHaveLength(0)

    await consentWorker.fetch(
      accountRequest('/auth/sign-in/email', { email, password }),
      env,
      createExecutionContext(),
    )
    expect(deliveries).toHaveLength(0)

    failConsent = false
    const retry = await consentWorker.fetch(
      accountRequest('/auth/sign-up/email', { name: 'Person', email, password }),
      env,
      createExecutionContext(),
    )

    expect(retry.status).toBe(200)
    expect(deliveries).toHaveLength(1)
    await expect(env.DB.prepare('SELECT user_id FROM user_consents').first()).resolves.toEqual(
      expect.objectContaining({ user_id: expect.any(String) }),
    )
  })

  it('wraps configuration failures with exact-origin CORS', async () => {
    const response = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/health', { headers: { Origin: appOrigin } }),
      { ...env, RESEND_API_KEY: '' },
      createExecutionContext(),
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(appOrigin)
  })
})
