const allowedHeaders = 'Content-Type, X-Turnstile-Token, X-Consent-Version'
const allowedMethods = 'GET, POST, PUT, DELETE, OPTIONS'

function appendVary(headers, value) {
  const existing = headers.get('Vary')
  const values = new Set((existing ?? '').split(',').map((item) => item.trim()).filter(Boolean))
  values.add(value)
  headers.set('Vary', [...values].join(', '))
}

export function withCors(request, response, env) {
  const headers = new Headers(response.headers)
  appendVary(headers, 'Origin')

  if (request.headers.get('Origin') === env.APP_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', env.APP_ORIGIN)
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
