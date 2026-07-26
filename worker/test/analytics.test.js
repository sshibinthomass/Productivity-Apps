import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorker } from '../src/index.js'
import { resetDatabase } from './support/database.js'

const origin = 'https://links.shibinthomas.com'

async function seedPublishedSite(db, { slug = 'maya-links' } = {}) {
  const data = {
    schemaVersion: 1, slug, revision: 1, theme: {}, seo: {},
    blocks: [
      { id: 'portfolio', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com' } },
      { id: 'socials', type: 'socials', visible: true, content: { links: [{ network: 'github', label: 'GitHub', url: 'https://github.com/maya' }] } },
      { id: 'hidden', type: 'link', visible: false, content: { label: 'Hidden', url: 'https://example.com/hidden' } },
    ],
  }
  await db.prepare(`INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, revision, published_at)
    VALUES (?1, 'site-1', ?2, 'Maya', 'Studio', 1, '2026-07-26T00:00:00.000Z')`)
    .bind(slug, JSON.stringify(data)).run()
}

function event(slug, body) {
  return new Request(`${origin}/v1/public/sites/${slug}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('public mini-site analytics', () => {
  let worker

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    worker = createWorker()
    await seedPublishedSite(env.DB)
  })

  it('records views and visible link or social clicks', async () => {
    const view = await worker.fetch(event('maya-links', { type: 'view', eventId: 'view-id-0001' }), env, createExecutionContext())
    const link = await worker.fetch(event('maya-links', { type: 'link_click', blockId: 'portfolio', eventId: 'click-id-0001' }), env, createExecutionContext())
    const social = await worker.fetch(event('maya-links', { type: 'link_click', blockId: 'socials', eventId: 'click-id-0002' }), env, createExecutionContext())

    expect(await view.json()).toEqual({ recorded: true, duplicate: false })
    expect(await link.json()).toEqual({ recorded: true, duplicate: false })
    expect(await social.json()).toEqual({ recorded: true, duplicate: false })
    await expect(env.DB.prepare('SELECT view_count, click_count FROM analytics_summary WHERE site_id = ?').bind('site-1').first()).resolves.toEqual({ view_count: 1, click_count: 2 })
  })

  it('rejects unknown, hidden, or unpublished click targets without incrementing counters', async () => {
    for (const body of [
      { type: 'link_click', blockId: 'unknown', eventId: 'click-id-0003' },
      { type: 'link_click', blockId: 'hidden', eventId: 'click-id-0004' },
    ]) {
      const response = await worker.fetch(event('maya-links', body), env, createExecutionContext())
      expect(response.status).toBe(400)
    }
    const missing = await worker.fetch(event('unpublished', { type: 'view', eventId: 'view-id-0002' }), env, createExecutionContext())
    expect(missing.status).toBe(404)
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM analytics_events').first()).resolves.toEqual({ count: 0 })
  })

  it('makes a duplicate receipt idempotent under concurrent delivery', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => worker.fetch(
      event('maya-links', { type: 'view', eventId: 'duplicate-0001' }), env, createExecutionContext(),
    )))
    const bodies = await Promise.all(responses.map((response) => response.json()))

    expect(bodies.filter(({ recorded }) => recorded)).toHaveLength(1)
    expect(bodies.filter(({ duplicate }) => duplicate)).toHaveLength(3)
    await expect(env.DB.prepare('SELECT view_count, click_count FROM analytics_summary WHERE site_id = ?').bind('site-1').first()).resolves.toEqual({ view_count: 1, click_count: 0 })
  })

  it('scheduled cleanup deletes expired receipts and expired authentication rate limits', async () => {
    await env.DB.prepare(`INSERT INTO analytics_events (receipt_id, site_id, event_type, expires_at)
      VALUES ('expired-receipt', 'site-1', 'view', '2020-01-01T00:00:00.000Z')`).run()
    await env.DB.prepare(`INSERT INTO auth_rate_limits (key_hash, window_started_at, attempt_count, expires_at)
      VALUES (?1, '2020-01-01T00:00:00.000Z', 1, '2020-01-01T00:00:00.000Z')`).bind('a'.repeat(64)).run()

    const context = createExecutionContext()
    await worker.scheduled({ scheduledTime: Date.now() }, env, context)

    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM analytics_events').first()).resolves.toEqual({ count: 0 })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).resolves.toEqual({ count: 0 })
  })
})
