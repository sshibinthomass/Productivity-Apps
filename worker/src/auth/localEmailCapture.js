import { isLocalDevelopmentOrigin } from '../http/cors.js'

const deliveries = []

export function isLocalEmailCaptureEnabled(env) {
  return env?.LOCAL_EMAIL_CAPTURE === 'true'
    && isLocalDevelopmentOrigin(env.APP_ORIGIN)
    && isLocalDevelopmentOrigin(env.API_ORIGIN)
}

export function createLocalEmailCapture() {
  function capture(type, { user, url }) {
    deliveries.push({ type, email: user.email, url })
  }

  return {
    sendVerification(message) {
      capture('verification', message)
    },
    sendPasswordReset(message) {
      capture('password-reset', message)
    },
  }
}

export function localEmailCaptureResponse(request, env) {
  if (!isLocalEmailCaptureEnabled(env)) return null
  if (request.method === 'DELETE') {
    deliveries.length = 0
    return new Response(null, { status: 204 })
  }
  if (request.method === 'GET') return Response.json({ deliveries })
  return new Response(null, { status: 405, headers: { Allow: 'GET, DELETE' } })
}
