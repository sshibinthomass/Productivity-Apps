import { createAuth } from './auth/createAuth.js'
import { enforceRateLimit } from './auth/rateLimit.js'
import { getSession } from './auth/session.js'
import { verifyTurnstile } from './auth/turnstile.js'
import { validateEnv } from './env.js'
import { withCors } from './http/cors.js'
import { ApiError, errorResponse } from './http/errors.js'

const consentVersion = '2026-07-26'
const protectedAuthRoutes = new Map([
  ['/auth/sign-up/email', { scope: 'sign-up', limit: 5, windowSeconds: 15 * 60 }],
  ['/auth/sign-in/email', { scope: 'sign-in', limit: 10, windowSeconds: 15 * 60 }],
  ['/auth/send-verification-email', { scope: 'resend-verification', limit: 3, windowSeconds: 60 * 60 }],
  ['/auth/request-password-reset', { scope: 'password-reset-request', limit: 3, windowSeconds: 60 * 60 }],
])

function normalizedEmail(body) {
  return typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
}

function clientNetwork(request) {
  return request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? 'unknown'
}

async function requestBody(request) {
  try {
    return await request.clone().json()
  } catch {
    return null
  }
}

async function recordConsent(db, userId) {
  await db.prepare(
    `INSERT INTO user_consents (user_id, terms_version, privacy_version, accepted_at)
     SELECT id, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     FROM "user" WHERE id = ?
     ON CONFLICT(user_id) DO NOTHING`,
  ).bind(consentVersion, consentVersion, userId).run()
}

async function handleAuthRequest(request, env, auth, dependencies) {
  const { pathname } = new URL(request.url)
  const limit = protectedAuthRoutes.get(pathname)

  if (limit && request.method === 'POST') {
    const body = await requestBody(request)
    const email = normalizedEmail(body)

    if (pathname === '/auth/sign-up/email'
      && request.headers.get('X-Consent-Version') !== consentVersion) {
      throw new ApiError(
        'invalid_consent',
        'Accept the current terms and privacy policy to continue.',
        400,
      )
    }

    await enforceRateLimit({
      db: env.DB,
      scope: limit.scope,
      identity: `${email}|${clientNetwork(request)}`,
      limit: limit.limit,
      windowSeconds: limit.windowSeconds,
      now: new Date(),
    })
    await (dependencies.verifyTurnstile ?? verifyTurnstile)({
      token: request.headers.get('X-Turnstile-Token'),
      secret: env.TURNSTILE_SECRET_KEY,
      hostname: new URL(env.APP_ORIGIN).hostname,
    })
  }

  const response = await auth.handler(request)
  if (pathname === '/auth/sign-up/email' && response.ok) {
    const body = await response.clone().json().catch(() => null)
    if (body?.user?.id) {
      await recordConsent(env.DB, body.user.id)
    }
  }
  return response
}

export function createWorker(dependencies = {}) {
  return {
    async fetch(request, runtimeEnv) {
      const { hostname, pathname } = new URL(request.url)
      if (hostname !== 'api.shibinthomas.com') {
        return Response.json(
          { error: { code: 'not_found', message: 'Not found.' } },
          { status: 404 },
        )
      }

      let env
      try {
        env = validateEnv(runtimeEnv)
      } catch (error) {
        return errorResponse(error)
      }

      try {
        if (request.method === 'OPTIONS') {
          return withCors(request, new Response(null, { status: 204 }), env)
        }

        if (pathname.startsWith('/auth/')) {
          const auth = createAuth(env, { email: dependencies.email })
          return withCors(request, await handleAuthRequest(request, env, auth, dependencies), env)
        }

        if (pathname === '/v1/session' && request.method === 'GET') {
          const auth = createAuth(env, { email: dependencies.email })
          const session = await getSession(auth, request)
          return withCors(request, Response.json({
            user: session ? {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
              emailVerified: session.user.emailVerified,
            } : null,
          }), env)
        }

        if (pathname === '/v1/health') {
          return withCors(request, Response.json({ ok: true }), env)
        }

        return withCors(request, errorResponse(new ApiError('not_found', 'Not found.', 404)), env)
      } catch (error) {
        return withCors(request, errorResponse(error), env)
      }
    },
  }
}

export default createWorker()
