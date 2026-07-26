import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { enforceRateLimit } from '../src/auth/rateLimit.js'
import { resetDatabase } from './support/database.js'

describe('enforceRateLimit', () => {
  const fixedNow = new Date('2026-07-26T12:00:00.000Z')
  const identity = 'person@example.com|203.0.113.10'

  beforeEach(() => resetDatabase(env.DB, env.TEST_MIGRATIONS))

  it('rejects the sixth registration attempt inside a fifteen-minute window', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await enforceRateLimit({
        db: env.DB,
        scope: 'sign-up',
        identity,
        limit: 5,
        windowSeconds: 900,
        now: fixedNow,
      })
    }

    await expect(
      enforceRateLimit({
        db: env.DB,
        scope: 'sign-up',
        identity,
        limit: 5,
        windowSeconds: 900,
        now: fixedNow,
      }),
    ).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Too many attempts. Try again later.',
      status: 429,
    })
  })

  it('allows a new attempt after the current rate-limit window', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await enforceRateLimit({
        db: env.DB,
        scope: 'sign-up',
        identity,
        limit: 5,
        windowSeconds: 900,
        now: fixedNow,
      })
    }

    await expect(
      enforceRateLimit({
        db: env.DB,
        scope: 'sign-up',
        identity,
        limit: 5,
        windowSeconds: 900,
        now: new Date(fixedNow.getTime() + 900_000),
      }),
    ).resolves.toBeUndefined()
  })

  it('stores a hash rather than the email address or network address', async () => {
    await enforceRateLimit({
      db: env.DB,
      scope: 'sign-up',
      identity,
      limit: 5,
      windowSeconds: 900,
      now: fixedNow,
    })

    const row = await env.DB.prepare('SELECT * FROM auth_rate_limits').first()
    expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(row)).not.toContain('person@example.com')
    expect(JSON.stringify(row)).not.toContain('203.0.113.10')
  })
})
