import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createD1Store } from '../src/sites/d1Store.js'
import { resetDatabase } from './support/database.js'

const now = '2026-07-26T10:00:00.000Z'

function draft({
  siteId = 'site-1',
  name = 'Maya Studio',
  slug = 'maya-studio',
  templateId = 'blank',
  draftRevision = 1,
  publishedRevision = 0,
} = {}) {
  return {
    siteId, name, slug, templateId, status: 'draft',
    blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com' } }],
    theme: {}, seo: { title: name, description: '', socialImagePath: null },
    draftRevision, publishedRevision, createdAt: now, updatedAt: now, publishedAt: null,
  }
}

async function create(store, overrides = {}) {
  return store.create({ userId: overrides.userId ?? 'user-1', draft: draft(overrides) })
}

describe('D1 mini-site store', () => {
  let store

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    store = createD1Store({ db: env.DB })
  })

  it('lists only the requesting owner\'s sites in newest-update order', async () => {
    await create(store, { siteId: 'owned-old', slug: 'owned-old', name: 'Owned old' })
    await env.DB.prepare('UPDATE mini_sites SET updated_at = ? WHERE id = ?').bind('2026-07-25T10:00:00.000Z', 'owned-old').run()
    await create(store, { siteId: 'other', slug: 'other-page', name: 'Other page', userId: 'user-2' })
    await create(store, { siteId: 'owned-new', slug: 'owned-new', name: 'Owned new' })

    await expect(store.list({ userId: 'user-1' })).resolves.toMatchObject([
      { siteId: 'owned-new', name: 'Owned new' },
      { siteId: 'owned-old', name: 'Owned old' },
    ])
  })

  it('treats a different owner\'s site as absent', async () => {
    await create(store)

    await expect(store.get({ userId: 'user-2', siteId: 'site-1' })).resolves.toBeNull()
  })

  it('maps the five-site trigger failure to site-limit', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await create(store, { siteId: `site-${index}`, slug: `page-${index}`, name: `Page ${index}` })
    }

    await expect(create(store, { siteId: 'site-6', slug: 'page-6', name: 'Page 6' })).resolves.toEqual({ code: 'site-limit' })
  })

  it('maps a globally conflicting slug to slug-taken', async () => {
    await create(store)

    await expect(create(store, { siteId: 'site-2', userId: 'user-2' })).resolves.toEqual({ code: 'slug-taken' })
  })

  it('increments an owned draft revision exactly once and detects stale saves', async () => {
    await create(store, { draftRevision: 2 })
    const next = draft({ name: 'Maya Updated', draftRevision: 2 })

    const result = await store.saveDraft({ userId: 'user-1', siteId: 'site-1', draft: next, expectedRevision: 2 })
    expect(result).toMatchObject({ name: 'Maya Updated', draftRevision: 3 })
    await expect(store.saveDraft({ userId: 'user-1', siteId: 'site-1', draft: next, expectedRevision: 2 })).resolves.toEqual({ code: 'revision-conflict' })
  })

  it('does not save another owner\'s draft', async () => {
    await create(store)

    await expect(store.saveDraft({ userId: 'user-2', siteId: 'site-1', draft: draft(), expectedRevision: 1 })).resolves.toEqual({ code: 'not-found' })
  })

  it('duplicates only an owned source into a distinct draft', async () => {
    await create(store)
    const copy = draft({ siteId: 'site-2', name: 'Maya Copy', slug: 'maya-copy', draftRevision: 1 })

    await expect(store.duplicate({ userId: 'user-1', sourceSiteId: 'site-1', draft: copy })).resolves.toMatchObject({ siteId: 'site-2', name: 'Maya Copy', status: 'draft' })
    await expect(store.duplicate({ userId: 'user-2', sourceSiteId: 'site-1', draft: draft({ siteId: 'site-3', slug: 'maya-other' }) })).resolves.toEqual({ code: 'not-found' })
  })

  it('changes the published site slug atomically while preserving its snapshot', async () => {
    await create(store)
    const snapshot = { schemaVersion: 1, siteId: 'site-1', slug: 'maya-studio', revision: 1, blocks: [], theme: {}, seo: { socialImageUrl: 'https://links.shibinthomas.com/assets/site-1/1/asset-1' } }
    await store.publish({ userId: 'user-1', siteId: 'site-1', snapshot, expectedRevision: 1, now })

    await expect(store.changeSlug({ userId: 'user-1', siteId: 'site-1', slug: 'maya-works' })).resolves.toMatchObject({ slug: 'maya-works', status: 'published' })
    await expect(env.DB.prepare('SELECT slug, snapshot_json FROM published_sites WHERE site_id = ?').bind('site-1').first()).resolves.toMatchObject({ slug: 'maya-works', snapshot_json: JSON.stringify(snapshot) })
  })

  it('publishes and unpublishes site state and snapshot together', async () => {
    await create(store)
    const snapshot = { schemaVersion: 1, siteId: 'site-1', slug: 'maya-studio', revision: 1, blocks: [], theme: {}, seo: { socialImageUrl: 'https://links.shibinthomas.com/assets/site-1/1/asset-1' } }

    await expect(store.publish({ userId: 'user-1', siteId: 'site-1', snapshot, expectedRevision: 1, now })).resolves.toEqual({ slug: 'maya-studio', revision: 1 })
    await expect(env.DB.prepare('SELECT social_image_url FROM published_sites WHERE site_id = ?').bind('site-1').first()).resolves.toEqual({ social_image_url: 'https://links.shibinthomas.com/assets/site-1/1/asset-1' })
    await expect(store.unpublish({ userId: 'user-1', siteId: 'site-1', now })).resolves.toEqual({ slug: 'maya-studio' })
    await expect(env.DB.prepare('SELECT * FROM published_sites WHERE site_id = ?').bind('site-1').first()).resolves.toBeNull()
    await expect(store.get({ userId: 'user-1', siteId: 'site-1' })).resolves.toMatchObject({ status: 'draft', publishedRevision: 1 })
  })

  it('deletes only when the supplied name exactly matches the owned site', async () => {
    await create(store)
    await expect(store.delete({ userId: 'user-1', siteId: 'site-1', confirmationName: 'maya studio' })).resolves.toEqual({ code: 'name-mismatch' })
    await expect(store.delete({ userId: 'user-2', siteId: 'site-1', confirmationName: 'Maya Studio' })).resolves.toEqual({ code: 'not-found' })
    await expect(store.delete({ userId: 'user-1', siteId: 'site-1', confirmationName: 'Maya Studio' })).resolves.toEqual({ deleted: true })
    await expect(store.get({ userId: 'user-1', siteId: 'site-1' })).resolves.toBeNull()
  })

  it('returns no more than thirty analytics days in ascending display order', async () => {
    await create(store)
    await env.DB.prepare('INSERT INTO analytics_summary (site_id, view_count, click_count) VALUES (?, ?, ?)').bind('site-1', 42, 7).run()
    for (let index = 1; index <= 31; index += 1) {
      const day = new Date(Date.UTC(2026, 5, index)).toISOString().slice(0, 10)
      await env.DB.prepare('INSERT INTO analytics_days (site_id, day, view_count, click_count) VALUES (?, ?, ?, ?)').bind('site-1', day, index, index - 1).run()
    }

    const analytics = await store.getAnalytics({ userId: 'user-1', siteId: 'site-1' })
    expect(analytics.summary).toEqual({ totalViews: 42, totalClicks: 7 })
    expect(analytics.days).toHaveLength(30)
    expect(analytics.days[0]).toEqual({ date: '2026-06-02', views: 2, clicks: 1 })
    expect(analytics.days.at(-1)).toEqual({ date: '2026-07-01', views: 31, clicks: 30 })
  })
})
