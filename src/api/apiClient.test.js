import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './apiClient.js'

describe('API client', () => {
  it('sends credentials and maps structured errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json(
        { error: { code: 'site_limit', message: 'Five sites maximum.' } },
        { status: 409 },
      ),
    )
    const client = createApiClient({ baseUrl: 'https://api.shibinthomas.com', fetchImpl })

    await expect(client.post('/v1/sites', {})).rejects.toMatchObject({
      code: 'site_limit', status: 409, message: 'Five sites maximum.',
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.shibinthomas.com/v1/sites',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
  })

  it('returns null for an empty 204 response', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.shibinthomas.com',
      fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    })

    await expect(client.delete('/v1/sites/site-1')).resolves.toBeNull()
  })

  it('rejects an invalid JSON success response as a normalized error', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.shibinthomas.com',
      fetchImpl: vi.fn().mockResolvedValue(new Response('{not json', { status: 200 })),
    })

    await expect(client.get('/v1/sites')).rejects.toMatchObject({
      code: 'invalid_response', status: 502,
    })
  })

  it('normalizes a network failure', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.shibinthomas.com',
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    })

    await expect(client.get('/v1/sites')).rejects.toMatchObject({
      code: 'network_error', status: 0,
    })
  })

  it('aborts a request that exceeds its timeout', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn().mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')))
    }))
    const client = createApiClient({ baseUrl: 'https://api.shibinthomas.com', fetchImpl, timeoutMs: 20 })
    const pending = client.get('/v1/sites')
    const assertion = expect(pending).rejects.toMatchObject({ code: 'timeout', status: 408 })
    await vi.advanceTimersByTimeAsync(20)

    await assertion
    vi.useRealTimers()
  })

  it('uploads FormData without setting a multipart content type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ asset: { assetId: 'asset-1' } }))
    const client = createApiClient({ baseUrl: 'https://api.shibinthomas.com/', fetchImpl })
    const body = new FormData()
    body.set('file', new File(['image'], 'image.png', { type: 'image/png' }))

    await expect(client.upload('/v1/sites/site-1/assets', body)).resolves.toEqual({ asset: { assetId: 'asset-1' } })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.shibinthomas.com/v1/sites/site-1/assets',
      expect.objectContaining({ method: 'POST', body, headers: undefined }),
    )
  })
})
