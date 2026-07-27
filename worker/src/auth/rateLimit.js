import { ApiError } from '../http/errors.js'

async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function windowDates(now, windowSeconds) {
  const current = new Date(now)
  const windowMilliseconds = windowSeconds * 1_000
  const windowStartedAt = Math.floor(current.getTime() / windowMilliseconds) * windowMilliseconds

  return {
    startedAt: new Date(windowStartedAt).toISOString(),
    expiresAt: new Date(windowStartedAt + windowMilliseconds).toISOString(),
  }
}

export async function enforceRateLimit({ db, scope, identity, limit, windowSeconds, now }) {
  const { startedAt, expiresAt } = windowDates(now, windowSeconds)
  const keyHash = await hash(`${scope}:${identity}`)
  const row = await db.prepare(
    `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempt_count, expires_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(key_hash) DO UPDATE SET
       window_started_at = excluded.window_started_at,
       attempt_count = CASE
         WHEN auth_rate_limits.window_started_at = excluded.window_started_at
         THEN auth_rate_limits.attempt_count + 1
         ELSE 1
       END,
       expires_at = excluded.expires_at
     RETURNING attempt_count`,
  ).bind(keyHash, startedAt, expiresAt).first()

  if (row.attempt_count > limit) {
    throw new ApiError('rate_limited', 'Too many attempts. Try again later.', 429)
  }
}
