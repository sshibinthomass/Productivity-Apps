import { ApiError } from '../http/errors.js'

const verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const challengeError = () => new ApiError(
  'invalid_challenge',
  'Complete the security check and try again.',
  400,
)

export async function verifyTurnstile({ token, secret, hostname, allowTestingKey = false, fetchImpl = fetch }) {
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

    const acceptedHostname = result.hostname === hostname
      || (allowTestingKey === true && result.metadata?.result_with_testing_key === true)
    if (!response.ok || result.success !== true || !acceptedHostname) {
      throw challengeError()
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw challengeError()
  }
}
