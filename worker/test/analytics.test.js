import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorker } from '../src/index.js'
import { createAnalyticsService } from '../src/analytics/service.js'
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

function event(slug, body, extraHeaders = {}) {
  return new Request(`${origin}/v1/public/sites/${slug}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(body),
  })
}

function paddedEventBytes(bytes) {
  const body = JSON.stringify({ type: 'view', eventId: 'byte-limit-event' })
  return `${body}${' '.repeat(bytes - new TextEncoder().encode(body).byteLength)}`
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
    await expect(env.DB.prepare('SELECT block_id, click_count FROM analytics_link_clicks WHERE site_id = ? ORDER BY block_id').bind('site-1').all()).resolves.toMatchObject({ results: [{ block_id: 'portfolio', click_count: 1 }, { block_id: 'socials', click_count: 1 }] })
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

  it('increments a durable per-link counter once for concurrent duplicate click receipts', async () => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => worker.fetch(
      event('maya-links', { type: 'link_click', blockId: 'portfolio', eventId: 'duplicate-link-0001' }), env, createExecutionContext(),
    )))
    expect((await Promise.all(responses.map((response) => response.json()))).filter(({ recorded }) => recorded)).toHaveLength(1)
    await expect(env.DB.prepare('SELECT click_count FROM analytics_link_clicks WHERE site_id = ? AND block_id = ?').bind('site-1', 'portfolio').first()).resolves.toEqual({ click_count: 1 })
  })

  it('rejects view block IDs, caps oversized bodies before JSON parsing, and rate limits a client before event writes', async () => {
    const viewWithBlock = await worker.fetch(event('maya-links', { type: 'view', blockId: 'portfolio', eventId: 'view-id-0003' }), env, createExecutionContext())
    expect(viewWithBlock.status).toBe(400)
    const huge = new Request(`${origin}/v1/public/sites/maya-links/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: `{${'x'.repeat(70 * 1024)}}` })
    const tooLarge = await worker.fetch(huge, env, createExecutionContext())
    expect(tooLarge.status).toBe(413)
    for (let number = 0; number < 30; number += 1) {
      expect((await worker.fetch(event('maya-links', { type: 'view', eventId: `rate-limit-${number}` }), env, createExecutionContext())).status).toBe(200)
    }
    const limited = await worker.fetch(event('maya-links', { type: 'view', eventId: 'rate-limit-overflow' }), env, createExecutionContext())
    expect(limited.status).toBe(429)
    await expect(limited.json()).resolves.toMatchObject({ error: { code: 'rate_limited' } })
  })

  it('accepts exactly 64 KiB and cancels a streaming body immediately beyond the byte limit', async () => {
    const exact = await worker.fetch(new Request(`${origin}/v1/public/sites/maya-links/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: paddedEventBytes(65536) }), env, createExecutionContext())
    expect(exact.status).toBe(200)
    const chunks = [new Uint8Array(65536), new Uint8Array(1)]
    let delivered = 0; let cancelled = false
    const stream = new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift()
        if (chunk) {
          delivered += chunk.byteLength
          controller.enqueue(chunk)
        }
      },
      cancel() { cancelled = true },
    })
    const oversized = await worker.fetch(new Request(`${origin}/v1/public/sites/maya-links/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' }), env, createExecutionContext())
    expect(oversized.status).toBe(413)
    expect(delivered).toBe(65537)
    expect(cancelled).toBe(true)
  })

  it('keeps the 30/31 public-event limit stable across a published slug change without storing the raw IP', async () => {
    const headers = { 'CF-Connecting-IP': '203.0.113.45' }
    const first = await worker.fetch(event('maya-links', { type: 'view', eventId: 'stable-key-first' }, headers), env, createExecutionContext())
    expect(first.status).toBe(200)
    await env.DB.prepare("UPDATE published_sites SET slug = 'maya-renamed' WHERE site_id = 'site-1'").run()
    const responses = await Promise.all(Array.from({ length: 30 }, (_, index) => worker.fetch(event('maya-renamed', { type: 'view', eventId: `stable-key-${index}` }, headers), env, createExecutionContext())))
    expect(responses.filter((response) => response.status === 200)).toHaveLength(29)
    expect(responses.filter((response) => response.status === 429)).toHaveLength(1)
    const row = await env.DB.prepare('SELECT key_hash FROM public_event_rate_limits').first()
    expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(row)).not.toContain('203.0.113.45')
  })

  it('gates a validated event on the same published site revision at commit time', async () => {
    let release; let validated
    const blocked = new Promise((resolve) => { release = resolve })
    const reached = new Promise((resolve) => { validated = resolve })
    const analytics = createAnalyticsService({ db: env.DB, rateLimitKey: 'test-rate-limit-key', beforePersist: async () => { validated(); await blocked } })
    const recording = analytics.record({ slug: 'maya-links', data: { type: 'view', eventId: 'race-event-0001' }, network: '203.0.113.1' })
    await reached
    await env.DB.prepare('DELETE FROM published_sites WHERE slug = ?').bind('maya-links').run()
    release()
    await expect(recording).resolves.toEqual({ recorded: false, duplicate: false })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM analytics_summary').first()).resolves.toEqual({ count: 0 })
  })

  it('uses canonical receipt tuples that keep adversarial delimiter event IDs distinct', async () => {
    const one = await worker.fetch(event('maya-links', { type: 'link_click', blockId: 'portfolio', eventId: 'same:link_click:portfolio' }), env, createExecutionContext())
    const two = await worker.fetch(event('maya-links', { type: 'link_click', blockId: 'socials', eventId: 'same:link_click:portfolio' }), env, createExecutionContext())
    expect(await one.json()).toMatchObject({ recorded: true })
    expect(await two.json()).toMatchObject({ recorded: true })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM analytics_events').first()).resolves.toEqual({ count: 2 })
  })

  it('scheduled cleanup deletes expired receipts and expired authentication rate limits', async () => {
    await env.DB.prepare(`INSERT INTO analytics_events (receipt_id, site_id, event_type, expires_at)
      VALUES ('expired-receipt', 'site-1', 'view', '2020-01-01T00:00:00.000Z')`).run()
    await env.DB.prepare(`INSERT INTO auth_rate_limits (key_hash, window_started_at, attempt_count, expires_at)
      VALUES (?1, '2020-01-01T00:00:00.000Z', 1, '2020-01-01T00:00:00.000Z')`).bind('a'.repeat(64)).run()
    await env.DB.prepare(`INSERT INTO public_event_rate_limits (key_hash, window_started_at, attempt_count, expires_at)
      VALUES (?1, '2020-01-01T00:00:00.000Z', 1, '2020-01-01T00:00:00.000Z')`).bind('b'.repeat(64)).run()

    const context = createExecutionContext()
    await worker.scheduled({ scheduledTime: Date.now() }, env, context)

    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM analytics_events').first()).resolves.toEqual({ count: 0 })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM auth_rate_limits').first()).resolves.toEqual({ count: 0 })
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM public_event_rate_limits').first()).resolves.toEqual({ count: 0 })
  })

  it('keeps durable link totals after receipt retention cleanup', async () => {
    await worker.fetch(event('maya-links', { type: 'link_click', blockId: 'portfolio', eventId: 'durable-click-0001' }), env, createExecutionContext())
    await env.DB.prepare("UPDATE analytics_events SET expires_at = '2020-01-01T00:00:00.000Z'").run()
    await worker.scheduled({ scheduledTime: Date.now() }, env, createExecutionContext())
    await expect(env.DB.prepare('SELECT COUNT(*) AS count FROM analytics_events').first()).resolves.toEqual({ count: 0 })
    await expect(env.DB.prepare('SELECT click_count FROM analytics_link_clicks WHERE site_id = ? AND block_id = ?').bind('site-1', 'portfolio').first()).resolves.toEqual({ click_count: 1 })
  })
})
