import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import worker, { isLocalRuntimeRequest, localRuntimeEnvironment } from '../src/index.js'
import { validateEnv } from '../src/env.js'
import { ApiError, errorResponse } from '../src/http/errors.js'
import { createRouter } from '../src/http/router.js'

describe('worker entrypoint', () => {
  it('serves API health only on the API hostname', async () => {
    const context = createExecutionContext()
    const response = await worker.fetch(
      new Request('https://api.shibinthomas.com/v1/health'),
      env,
      context,
    )
    await waitOnExecutionContext(context)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('rejects unknown hostnames', async () => {
    const response = await worker.fetch(
      new Request('https://unknown.example/v1/health'),
      env,
      createExecutionContext(),
    )
    expect(response.status).toBe(404)
  })
})

describe('HTTP runtime helpers', () => {
  it('returns a stable JSON response for API errors', async () => {
    const response = errorResponse(
      new ApiError('invalid_input', 'The submitted input is invalid.', 400),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_input',
        message: 'The submitted input is invalid.',
      },
    })
  })

  it('dispatches a handler registered for a request method and path', async () => {
    const router = createRouter()
    router.get('/v1/example', () => Response.json({ route: 'get' }))
    router.post('/v1/example', () => Response.json({ route: 'post' }))
    router.put('/v1/example', () => Response.json({ route: 'put' }))
    router.delete('/v1/example', () => Response.json({ route: 'delete' }))

    const responses = await Promise.all(
      ['GET', 'POST', 'PUT', 'DELETE'].map((method) =>
        router.handle(
          new Request('https://api.shibinthomas.com/v1/example', { method }),
          env,
          createExecutionContext(),
        ),
      ),
    )

    await expect(Promise.all(responses.map((response) => response.json()))).resolves.toEqual([
      { route: 'get' },
      { route: 'post' },
      { route: 'put' },
      { route: 'delete' },
    ])
  })

  it('returns the standard not-found response when no route is registered', async () => {
    const response = await createRouter().handle(
      new Request('https://api.shibinthomas.com/v1/missing'),
      env,
      createExecutionContext(),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'not_found', message: 'Not found.' },
    })
  })

  it('normalizes required string bindings while retaining runtime bindings', () => {
    const normalized = validateEnv({
      ...env,
      APP_ORIGIN: ' https://app.shibinthomas.com ',
    })

    expect(normalized.APP_ORIGIN).toBe('https://app.shibinthomas.com')
    expect(normalized.DB).toBe(env.DB)
  })

  it('retains optional local runtime bindings when the platform exposes them as non-enumerable fields', () => {
    const runtime = { ...env }
    Object.defineProperties(runtime, {
      DEV_ORIGIN: { enumerable: false, value: 'http://127.0.0.1:4173' },
      LOCAL_EMAIL_CAPTURE: { enumerable: false, value: 'true' },
    })

    const normalized = validateEnv(runtime)
    expect(normalized.DEV_ORIGIN).toBe('http://127.0.0.1:4173')
    expect(normalized.LOCAL_EMAIL_CAPTURE).toBe('true')
  })

  it('rewrites every local runtime origin to the explicit loopback Worker origin only for a local request', () => {
    const local = {
      ...env,
      APP_ORIGIN: 'https://app.shibinthomas.com',
      API_ORIGIN: 'https://api.shibinthomas.com',
      PUBLIC_SITE_ORIGIN: 'https://links.shibinthomas.com',
      DEV_ORIGIN: 'http://127.0.0.1:4173',
      LOCAL_API_ORIGIN: 'http://127.0.0.1:8787',
    }

    expect(localRuntimeEnvironment(local, true)).toMatchObject({
      APP_ORIGIN: 'http://127.0.0.1:4173',
      API_ORIGIN: 'http://127.0.0.1:8787',
      PUBLIC_SITE_ORIGIN: 'http://127.0.0.1:8787',
    })
    expect(localRuntimeEnvironment(local, false).PUBLIC_SITE_ORIGIN).toBe('https://links.shibinthomas.com')
    expect(localRuntimeEnvironment(env, false).PUBLIC_SITE_ORIGIN).toBe(env.PUBLIC_SITE_ORIGIN)
  })

  it('requires absent deployed Cloudflare request metadata before enabling the local runtime', () => {
    const local = { ...env, DEV_ORIGIN: 'http://127.0.0.1:4173', LOCAL_API_ORIGIN: 'http://127.0.0.1:8787' }
    expect(isLocalRuntimeRequest(new Request('http://127.0.0.1:8787/v1/health'), local)).toBe(true)
    expect(isLocalRuntimeRequest(new Request('https://api.shibinthomas.com/v1/health', { headers: { 'CF-Ray': '1234-FRA' } }), local)).toBe(false)
  })

  it('rejects an environment with a missing required secret', () => {
    expect(() => validateEnv({ ...env, RESEND_API_KEY: '' })).toThrow(
      'Missing required environment variable: RESEND_API_KEY',
    )
  })
})
