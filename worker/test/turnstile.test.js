import { describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from '../src/auth/turnstile.js'

const challengeError = {
  code: 'invalid_challenge',
  message: 'Complete the security check and try again.',
  status: 400,
}

describe('verifyTurnstile', () => {
  it('accepts only a successful token for the configured hostname', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({ success: true, hostname: 'app.shibinthomas.com' }),
    )

    await expect(
      verifyTurnstile({
        token: 'token',
        secret: 'secret',
        hostname: 'app.shibinthomas.com',
        fetchImpl,
      }),
    ).resolves.toBeUndefined()

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      response: 'token',
      secret: 'secret',
    })
  })

  it.each([
    ['is missing', undefined, { success: true, hostname: 'app.shibinthomas.com' }],
    ['is rejected by Turnstile', 'token', { success: false, hostname: 'app.shibinthomas.com' }],
    ['was solved for a different hostname', 'token', { success: true, hostname: 'other.example' }],
  ])('rejects a token that %s without exposing provider details', async (_, token, body) => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(body))

    await expect(
      verifyTurnstile({
        token,
        secret: 'secret',
        hostname: 'app.shibinthomas.com',
        fetchImpl,
      }),
    ).rejects.toMatchObject(challengeError)
  })

  it('maps a Turnstile network failure to the stable challenge error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('Cloudflare connection refused'))

    await expect(
      verifyTurnstile({
        token: 'token',
        secret: 'secret',
        hostname: 'app.shibinthomas.com',
        fetchImpl,
      }),
    ).rejects.toMatchObject(challengeError)
  })
})
