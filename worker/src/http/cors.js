const allowedHeaders = 'Content-Type, X-Turnstile-Token, X-Consent-Version'
const allowedMethods = 'GET, POST, PUT, DELETE, OPTIONS'

function isExactHttpOrigin(value) {
  if (typeof value !== 'string' || value.trim() !== value) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value
  } catch {
    return false
  }
}

export function configuredOrigins(env) {
  return [env?.APP_ORIGIN, env?.DEV_ORIGIN].filter(isExactHttpOrigin)
}

export function isAllowedOrigin(origin, env) {
  return configuredOrigins(env).includes(origin)
}

function appendVary(headers, value) {
  const existing = headers.get('Vary')
  const values = new Set((existing ?? '').split(',').map((item) => item.trim()).filter(Boolean))
  values.add(value)
  headers.set('Vary', [...values].join(', '))
}

export function withCors(request, response, env) {
  const headers = new Headers(response.headers)
  appendVary(headers, 'Origin')

  const origin = request.headers.get('Origin')
  if (isAllowedOrigin(origin, env)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')

    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', allowedMethods)
      headers.set('Access-Control-Allow-Headers', allowedHeaders)
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
