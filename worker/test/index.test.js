import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import worker from '../src/index.js'
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

  it('rejects an environment with a missing required secret', () => {
    expect(() => validateEnv({ ...env, RESEND_API_KEY: '' })).toThrow(
      'Missing required environment variable: RESEND_API_KEY',
    )
  })
})
