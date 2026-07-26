import { createAuth } from './auth/createAuth.js'
import { enforceRateLimit } from './auth/rateLimit.js'
import { getSession } from './auth/session.js'
import { verifyTurnstile } from './auth/turnstile.js'
import { validateEnv } from './env.js'
import { isAllowedOrigin, withCors } from './http/cors.js'
import { ApiError, errorResponse } from './http/errors.js'
import { requireUser } from './auth/session.js'
import { createD1Store } from './sites/d1Store.js'
import { createMiniSiteService } from './sites/service.js'
import { createSiteRoutes, requiresJsonSiteBody, requiresMultipartAssetUpload } from './sites/routes.js'
import { createAssetService } from './assets/service.js'

const consentVersion = '2026-07-26'
const protectedAuthRoutes = new Map([
  ['/auth/sign-up/email', { scope: 'sign-up', limit: 5, windowSeconds: 15 * 60 }],
  ['/auth/sign-in/email', { scope: 'sign-in', limit: 10, windowSeconds: 15 * 60 }],
  ['/auth/send-verification-email', { scope: 'resend-verification', limit: 3, windowSeconds: 60 * 60 }],
  ['/auth/request-password-reset', { scope: 'password-reset-request', limit: 3, windowSeconds: 60 * 60 }],
])
const publicAuthRoutes = new Map([
  ['POST /auth/sign-up/email', 'sign-up'],
  ['POST /auth/sign-in/email', 'sign-in'],
  ['POST /auth/send-verification-email', 'resend-verification'],
  ['POST /auth/request-password-reset', 'password-reset-request'],
  ['POST /auth/reset-password', 'reset-password'],
  ['POST /auth/sign-out', 'sign-out'],
  ['GET /auth/verify-email', 'verify-email'],
])

function normalizedEmail(body) {
  return typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
}

function clientNetwork(request) {
  return request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? 'unknown'
}

function isUnsafeMethod(method) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method)
}

function isJsonContentType(request) {
  return /^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')
}

function isMultipartContentType(request) {
  return /^multipart\/form-data\s*;/i.test(request.headers.get('Content-Type') ?? '')
}

async function requestBody(request) {
  try {
    return await request.clone().json()
  } catch {
    return null
  }
}

async function recordConsent({ db, userId }) {
  await db.prepare(
    `INSERT INTO user_consents (user_id, terms_version, privacy_version, accepted_at)
     SELECT id, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     FROM "user" WHERE id = ?
     ON CONFLICT(user_id) DO UPDATE SET
       terms_version = excluded.terms_version,
       privacy_version = excluded.privacy_version,
       accepted_at = excluded.accepted_at`,
  ).bind(consentVersion, consentVersion, userId).run()
}

async function findUserByEmail(db, email) {
  return db.prepare(
    `SELECT u.id, u.email, u.emailVerified
     FROM "user" u
     WHERE u.email = ?`,
  ).bind(email).first()
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
  }
}

function authRoute(method, pathname) {
  const fixedRoute = publicAuthRoutes.get(`${method} ${pathname}`)
  if (fixedRoute) return fixedRoute

  if (method === 'GET' && /^\/auth\/reset-password\/[^/]+$/.test(pathname)) {
    return 'reset-password-callback'
  }

  return null
}

async function sanitizeAuthResponse(response, route) {
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return response
  }

  const body = await response.clone().json().catch(() => null)
  if (!body) return response
  let safeBody
  switch (route) {
    case 'sign-up':
    case 'sign-in':
      safeBody = { user: publicUser(body.user) }
      break
    case 'sign-out':
      safeBody = { success: body.success === true }
      break
    case 'resend-verification':
    case 'password-reset-request':
    case 'reset-password':
      safeBody = { status: body.status === true }
      break
    case 'verify-email':
      safeBody = { status: body.status === true, user: publicUser(body.user) }
      break
    default:
      return response
  }

  const headers = new Headers(response.headers)
  headers.set('Content-Type', 'application/json')
  headers.delete('Content-Length')
  return new Response(JSON.stringify(safeBody), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function verificationRequest(request, env, body, email) {
  const verificationBody = { email }
  if (typeof body?.callbackURL === 'string') {
    verificationBody.callbackURL = body.callbackURL
  }
  return new Request(`${env.API_ORIGIN}/auth/send-verification-email`, {
    method: 'POST',
    headers: {
      Origin: request.headers.get('Origin'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verificationBody),
  })
}

async function persistConsentAndSendVerification(request, env, auth, body, dependencies) {
  const email = normalizedEmail(body)
  const user = await findUserByEmail(env.DB, email)
  if (!user || user.emailVerified) return

  await (dependencies.recordConsent ?? recordConsent)({ db: env.DB, userId: user.id })
  await auth.handler(verificationRequest(request, env, body, user.email))
}

async function handleAuthRequest(request, env, auth, dependencies) {
  const { pathname } = new URL(request.url)
  const limit = protectedAuthRoutes.get(pathname)

  if (limit && request.method === 'POST') {
    const body = await requestBody(request)
    const email = normalizedEmail(body)

    const origin = request.headers.get('Origin')
    if (!isAllowedOrigin(origin, env)) {
      throw new ApiError('invalid_origin', 'Invalid request origin.', 403)
    }

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
      hostname: new URL(origin).hostname,
    })

    const response = await auth.handler(request)
    if (pathname === '/auth/sign-up/email' && response.ok) {
      await persistConsentAndSendVerification(request, env, auth, body, dependencies)
    }
    return response
  }

  return auth.handler(request)
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
      const corsEnv = {
        APP_ORIGIN: runtimeEnv?.APP_ORIGIN,
        DEV_ORIGIN: runtimeEnv?.DEV_ORIGIN,
      }
      try {
        env = validateEnv(runtimeEnv)
      } catch (error) {
        return withCors(request, errorResponse(error), corsEnv)
      }

      try {
        if (request.method === 'OPTIONS') {
          return withCors(request, new Response(null, { status: 204 }), env)
        }

        if (pathname.startsWith('/auth/')) {
          const route = authRoute(request.method, pathname)
          if (!route) {
            return withCors(request, errorResponse(new ApiError('not_found', 'Not found.', 404)), env)
          }
          const auth = createAuth(env, { email: dependencies.email })
          const response = await handleAuthRequest(request, env, auth, dependencies)
          return withCors(request, await sanitizeAuthResponse(response, route), env)
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

        if (pathname === '/v1/sites' || pathname.startsWith('/v1/sites/')) {
          if (isUnsafeMethod(request.method) && !isAllowedOrigin(request.headers.get('Origin'), env)) {
            return withCors(request, errorResponse(new ApiError('invalid_origin', 'Invalid request origin.', 403)), env)
          }
          if (requiresJsonSiteBody(request) && !isJsonContentType(request)) {
            return withCors(request, errorResponse(new ApiError('unsupported_media_type', 'Use application/json for this request.', 415)), env)
          }
          if (requiresMultipartAssetUpload(request) && !isMultipartContentType(request)) {
            return withCors(request, errorResponse(new ApiError('unsupported_media_type', 'Use multipart/form-data with a file field.', 415)), env)
          }
          const auth = createAuth(env, { email: dependencies.email })
          const store = createD1Store({ db: env.DB })
          const assets = createAssetService({ bucket: env.MEDIA, db: env.DB, publicOrigin: env.PUBLIC_SITE_ORIGIN })
          const routes = createSiteRoutes({
            auth,
            store,
            assets,
            service: createMiniSiteService({ store, assets }),
            requireUser: dependencies.requireUser ?? requireUser,
          })
          return withCors(request, await routes.handle(request), env)
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
