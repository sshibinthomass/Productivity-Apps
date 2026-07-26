import { ApiError } from '../http/errors.js'

const verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const challengeError = () => new ApiError(
  'invalid_challenge',
  'Complete the security check and try again.',
  400,
)

export async function verifyTurnstile({ token, secret, hostname, fetchImpl = fetch }) {
  if (typeof token !== 'string' || token.trim() === '') {
    throw challengeError()
  }

  try {
    const response = await fetchImpl(verificationUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(5_000),
    })
    const result = await response.json()

    if (!response.ok || result.success !== true || result.hostname !== hostname) {
      throw challengeError()
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw challengeError()
  }
}
