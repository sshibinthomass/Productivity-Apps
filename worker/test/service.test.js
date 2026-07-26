import { describe, expect, it } from 'vitest'
import { createMiniSiteService } from '../src/sites/service.js'

const validCreateInput = { name: 'Maya Studio', slug: 'maya-studio', templateId: 'blank' }

function makeDraft(overrides = {}) {
  return {
    siteId: 'site-1', name: 'Maya Studio', slug: 'maya-studio', templateId: 'blank', status: 'draft',
    blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '' } }],
    theme: {}, seo: { title: 'Maya Studio', description: '', socialImagePath: null }, draftRevision: 1, publishedRevision: 0, ...overrides,
  }
}

function createStore({ siteCount = 0 } = {}) {
  const sites = new Map(), slugs = new Map(), published = new Map(), receipts = new Set(), events = []
  return {
    sites, slugs, published, events,
    async create({ userId, draft }) { if (siteCount >= 5) return { code: 'site-limit' }; if (slugs.has(draft.slug)) return { code: 'slug-taken' }; siteCount++; sites.set(`${userId}/${draft.siteId}`, structuredClone(draft)); slugs.set(draft.slug, { userId, siteId: draft.siteId }); return structuredClone(draft) },
    async get({ userId, siteId }) { return structuredClone(sites.get(`${userId}/${siteId}`) ?? null) },
    async saveDraft({ userId, siteId, draft, expectedRevision }) { const key = `${userId}/${siteId}`, current = sites.get(key); if (!current) return { code: 'not-found' }; if (current.draftRevision !== expectedRevision) return { code: 'revision-conflict' }; const saved = { ...current, ...structuredClone(draft), draftRevision: current.draftRevision + 1 }; sites.set(key, saved); return structuredClone(saved) },
    async duplicate({ userId, sourceSiteId, draft }) { if (!sites.has(`${userId}/${sourceSiteId}`)) return { code: 'not-found' }; return this.create({ userId, draft }) },
    async changeSlug({ userId, siteId, slug }) { const site = sites.get(`${userId}/${siteId}`); if (!site) return { code: 'not-found' }; if (slugs.has(slug)) return { code: 'slug-taken' }; slugs.delete(site.slug); site.slug = slug; slugs.set(slug, { userId, siteId }); return structuredClone(site) },
    async publish({ userId, siteId, snapshot, expectedRevision }) { const site = sites.get(`${userId}/${siteId}`); if (!site) return { code: 'not-found' }; if (site.draftRevision !== expectedRevision) return { code: 'revision-conflict' }; site.status = 'published'; site.publishedRevision = site.draftRevision; published.set(site.slug, structuredClone(snapshot)); return { slug: site.slug, revision: site.draftRevision } },
    async unpublish({ userId, siteId }) { const site = sites.get(`${userId}/${siteId}`); if (!site) return { code: 'not-found' }; site.status = 'draft'; published.delete(site.slug); return { slug: site.slug } },
    async delete({ userId, siteId, confirmationName }) { const key = `${userId}/${siteId}`, site = sites.get(key); if (!site) return { code: 'not-found' }; if (site.name !== confirmationName) return { code: 'name-mismatch' }; sites.delete(key); slugs.delete(site.slug); published.delete(site.slug); siteCount--; return { deleted: true } },
    async recordEvent({ slug, type, blockId, receiptId }) { const snapshot = published.get(slug); if (!snapshot) return { code: 'not-found' }; if (type === 'link_click' && !snapshot.blocks.some((block) => block.id === blockId && ['link', 'socials'].includes(block.type))) return { code: 'unknown-link' }; if (receipts.has(receiptId)) return { duplicate: true }; receipts.add(receiptId); events.push({ slug, type, blockId }); return { recorded: true } },
  }
}

describe('mini-site lifecycle service', () => {
  it('requires a user id for every management operation', async () => {
    const service = createMiniSiteService({ store: createStore() })
    await expect(service.createMiniSite({ userId: null, data: validCreateInput })).rejects.toMatchObject({ code: 'unauthenticated' })
    for (const method of ['duplicateMiniSite', 'saveMiniSiteDraft', 'changeMiniSiteSlug', 'publishMiniSite', 'unpublishMiniSite', 'deleteMiniSite']) {
      await expect(service[method]({ userId: '', data: {} })).rejects.toMatchObject({ code: 'unauthenticated' })
    }
  })

  it.each([{}, [], ' ', '\t', 0])('rejects non-string or blank user IDs before calling the store', async (userId) => {
    let calls = 0
    const service = createMiniSiteService({
      store: { async create() { calls += 1 } },
    })
    await expect(service.createMiniSite({ userId, data: validCreateInput })).rejects.toMatchObject({ code: 'unauthenticated' })
    expect(calls).toBe(0)
  })

  it('creates sites through the five-site boundary and preserves template differences', async () => {
    const store = createStore({ siteCount: 4 }); let nextId = 4
    const service = createMiniSiteService({ store, createId: () => `site-${++nextId}`, now: () => '2026-07-26T10:00:00.000Z' })
    await expect(service.createMiniSite({ userId: 'user-1', data: validCreateInput })).resolves.toMatchObject({ siteId: 'site-5', slug: 'maya-studio' })
    await expect(service.createMiniSite({ userId: 'user-1', data: { ...validCreateInput, name: 'Second', slug: 'second-site' } })).rejects.toMatchObject({ code: 'site_limit' })
    const differentStore = createStore(); let id = 0; const differentService = createMiniSiteService({ store: differentStore, createId: () => `site-${++id}` })
    const creator = await differentService.createMiniSite({ userId: 'user-1', data: { name: 'Creator', slug: 'creator-page', templateId: 'creator' } })
    const bold = await differentService.createMiniSite({ userId: 'user-1', data: { name: 'Bold', slug: 'bold-page', templateId: 'bold' } })
    expect(creator.theme).not.toEqual(bold.theme); expect(creator.blocks).not.toEqual(bold.blocks)
  })

  it('duplicates only owned sites into a new draft', async () => {
    const store = createStore(); store.sites.set('user-1/site-1', makeDraft())
    const service = createMiniSiteService({ store, createId: () => 'site-2', now: () => '2026-07-26T10:00:00.000Z' })
    await expect(service.duplicateMiniSite({ userId: 'user-1', data: { sourceSiteId: 'site-1', name: 'Copy', slug: 'maya-copy', templateId: 'blank' } })).resolves.toMatchObject({ siteId: 'site-2', name: 'Copy', slug: 'maya-copy', status: 'draft', draftRevision: 0 })
    await expect(service.duplicateMiniSite({ userId: 'other-user', data: { sourceSiteId: 'site-1', name: 'Copy', slug: 'other-copy', templateId: 'blank' } })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('saves owned drafts with revision, block, and link limits enforced', async () => {
    const store = createStore(), original = makeDraft(); store.sites.set('user-1/site-1', original); const service = createMiniSiteService({ store })
    const saved = await service.saveMiniSiteDraft({ userId: 'user-1', data: { siteId: 'site-1', expectedRevision: 1, draft: { ...original, name: 'Updated site', blocks: [{ id: 'image-1', type: 'image', content: { url: 'https://storage.example/draft-token', storagePath: 'mini-site-drafts/user-1/site-1/image-1.webp', alt: 'Example' } }] } } })
    expect(saved).toMatchObject({ name: 'Updated site', draftRevision: 2 })
    expect(saved.blocks[0].content.storagePath).toBe('mini-site-drafts/user-1/site-1/image-1.webp')
    await expect(service.saveMiniSiteDraft({ userId: 'user-1', data: { siteId: 'site-1', expectedRevision: 2, draft: { ...original, blocks: Array.from({ length: 26 }, (_, index) => ({ id: `link-${index}`, type: 'link', content: {} })) } } })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(service.saveMiniSiteDraft({ userId: 'user-1', data: { siteId: 'site-1', expectedRevision: -1, draft: original } })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(service.saveMiniSiteDraft({ userId: 'user-1', data: { siteId: 'site-1', expectedRevision: 2, draft: { ...original, blocks: Array.from({ length: 40 }, (_, index) => ({ id: `paragraph-${index}`, type: 'paragraph', content: { text: `Paragraph ${index}` } })) } } })).resolves.toMatchObject({ draftRevision: 3 })
  })

  it('changes slugs, publishes sanitized snapshots, and unpublishes', async () => {
    const store = createStore(); store.sites.set('user-1/site-1', makeDraft()); store.slugs.set('maya-studio', { userId: 'user-1', siteId: 'site-1' }); const service = createMiniSiteService({ store })
    await expect(service.changeMiniSiteSlug({ userId: 'user-1', data: { siteId: 'site-1', slug: 'maya-works' } })).resolves.toMatchObject({ slug: 'maya-works' })
    await expect(service.publishMiniSite({ userId: 'user-1', data: { siteId: 'site-1' } })).resolves.toMatchObject({ slug: 'maya-works', revision: 1 })
    expect(store.published.get('maya-works').ownerEmail).toBeUndefined()
    await expect(service.unpublishMiniSite({ userId: 'user-1', data: { siteId: 'site-1' } })).resolves.toEqual({ slug: 'maya-works' })
    expect(store.slugs.has('maya-works')).toBe(true); expect(store.published.has('maya-works')).toBe(false)
  })

  it('promotes assets before snapshot creation and cleans them up after a revision conflict', async () => {
    const store = createStore(), draft = makeDraft({ blocks: [{ id: 'image-1', type: 'image', visible: true, content: { url: 'blob:private', storagePath: 'mini-site-drafts/user-1/site-1/image-1', alt: 'Ceramic vessel', decorative: false } }] }); store.sites.set('user-1/site-1', draft)
    store.promoteAssets = async ({ draft: source }) => ({ draft: { ...source, blocks: source.blocks.map((block) => ({ ...block, content: { ...block.content, url: 'https://storage.example/public/image-1.webp' } })) }, publicPaths: ['mini-site-public/site-1/1/image-1.webp'] })
    const service = createMiniSiteService({ store }); await service.publishMiniSite({ userId: 'user-1', data: { siteId: 'site-1' } }); expect(store.published.get('maya-studio').blocks[0].content.url).toBe('https://storage.example/public/image-1.webp')
    let cleanedPaths; store.publish = async () => ({ code: 'revision-conflict' }); store.cleanupPromotedAssets = async ({ publicPaths }) => { cleanedPaths = publicPaths }
    await expect(service.publishMiniSite({ userId: 'user-1', data: { siteId: 'site-1' } })).rejects.toMatchObject({ code: 'revision_conflict' }); expect(cleanedPaths).toEqual(['mini-site-public/site-1/1/image-1.webp'])
  })

  it('does not publish incomplete or over-limit drafts', async () => {
    const store = createStore(); store.sites.set('user-1/site-1', makeDraft({ blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: '', url: '' } }] })); const service = createMiniSiteService({ store })
    await expect(service.publishMiniSite({ userId: 'user-1', data: { siteId: 'site-1' } })).rejects.toMatchObject({ code: 'invalid_argument' }); expect(store.published.size).toBe(0)
    store.sites.set('user-1/site-1', makeDraft({ blocks: Array.from({ length: 26 }, (_, index) => ({ id: `link-${index}`, type: 'link', visible: true, content: { label: `Link ${index}`, url: 'https://example.com' } })) }))
    await expect(service.publishMiniSite({ userId: 'user-1', data: { siteId: 'site-1' } })).rejects.toMatchObject({ code: 'invalid_argument' })
  })

  it('requires ownership and exact confirmation before deletion', async () => {
    const store = createStore(); store.sites.set('user-1/site-1', makeDraft()); const service = createMiniSiteService({ store })
    await expect(service.deleteMiniSite({ userId: 'other-user', data: { siteId: 'site-1', confirmationName: 'Maya Studio' } })).rejects.toMatchObject({ code: 'not_found' })
    await expect(service.deleteMiniSite({ userId: 'user-1', data: { siteId: 'site-1', confirmationName: 'Wrong' } })).rejects.toMatchObject({ code: 'name_mismatch' })
  })

  it('records valid public events once and rejects unknown links', async () => {
    const store = createStore(); store.published.set('maya-studio', { blocks: [{ id: 'link-1', type: 'link', visible: true }, { id: 'socials-1', type: 'socials', visible: true }] }); const service = createMiniSiteService({ store })
    const data = { slug: 'maya-studio', type: 'link_click', blockId: 'link-1', eventId: 'event-12345678' }
    await expect(service.recordMiniSiteEvent({ data })).resolves.toEqual({ recorded: true }); await expect(service.recordMiniSiteEvent({ data })).resolves.toEqual({ duplicate: true }); expect(store.events).toHaveLength(1)
    await expect(service.recordMiniSiteEvent({ data: { ...data, blockId: 'missing', eventId: 'event-abcdefgh' } })).rejects.toMatchObject({ code: 'invalid_argument' })
    await expect(service.recordMiniSiteEvent({ data: { ...data, blockId: 'socials-1', eventId: 'social-event-123456' } })).resolves.toEqual({ recorded: true })
  })
})
