import { describe, expect, it } from 'vitest'
import { withCors } from '../src/http/cors.js'

describe('CORS', () => {
  const env = { APP_ORIGIN: 'https://app.shibinthomas.com' }

  it('allows credentials only for the configured application origin', () => {
    const request = new Request('https://api.shibinthomas.com/v1/session', {
      headers: { Origin: 'https://app.shibinthomas.com' },
    })

    const response = withCors(request, Response.json({ user: null }), env)

    expect(response.headers.get('Access-Control-Allow-Origin'))
      .toBe('https://app.shibinthomas.com')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toContain('Origin')
  })

  it('does not grant CORS access to an untrusted origin', () => {
    const request = new Request('https://api.shibinthomas.com/v1/session', {
      headers: { Origin: 'https://untrusted.example' },
    })

    const response = withCors(request, Response.json({ user: null }), env)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('accepts the authentication preflight headers', () => {
    const request = new Request('https://api.shibinthomas.com/auth/sign-up/email', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.shibinthomas.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Turnstile-Token, X-Consent-Version',
      },
    })

    const response = withCors(request, new Response(null, { status: 204 }), env)

    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Turnstile-Token')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Consent-Version')
  })
})
