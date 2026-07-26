import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './support/database.js'

describe('mini-site schema', () => {
  beforeEach(() => resetDatabase(env.DB, env.TEST_MIGRATIONS))

  it('rejects a sixth site for one owner', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await env.DB.prepare(
        'INSERT INTO mini_sites (id, owner_id, name, slug, draft_json) VALUES (?, ?, ?, ?, ?)',
      ).bind(`site-${index}`, 'user-1', `Site ${index}`, `site-${index}`, '{}').run()
    }

    await expect(
      env.DB.prepare(
        'INSERT INTO mini_sites (id, owner_id, name, slug, draft_json) VALUES (?, ?, ?, ?, ?)',
      ).bind('site-6', 'user-1', 'Site 6', 'site-6', '{}').run(),
    ).rejects.toThrow(/site_limit/)
  })

  it('keeps slugs globally unique', async () => {
    await env.DB.prepare(
      'INSERT INTO mini_sites (id, owner_id, name, slug, draft_json) VALUES (?, ?, ?, ?, ?)',
    ).bind('site-1', 'user-1', 'One', 'shared-slug', '{}').run()

    await expect(
      env.DB.prepare(
        'INSERT INTO mini_sites (id, owner_id, name, slug, draft_json) VALUES (?, ?, ?, ?, ?)',
      ).bind('site-2', 'user-2', 'Two', 'shared-slug', '{}').run(),
    ).rejects.toThrow()
  })
})
