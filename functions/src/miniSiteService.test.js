import { describe, expect, it } from 'vitest'
import { createMiniSiteService } from './miniSiteService.js'

function makeDraft(overrides = {}) {
  return {
    siteId: 'site-1',
    name: 'Maya Studio',
    slug: 'maya-studio',
    templateId: 'blank',
    status: 'draft',
    blocks: [
      {
        id: 'link-1',
        type: 'link',
        visible: true,
        content: {
          label: 'Portfolio',
          url: 'https://example.com',
          supportingText: '',
          icon: '',
        },
      },
    ],
    theme: {},
    seo: { title: 'Maya Studio', description: '', socialImagePath: null },
    draftRevision: 1,
    publishedRevision: 0,
    ...overrides,
  }
}

function createMemoryStore({ siteCount = 0 } = {}) {
  const sites = new Map()
  const slugs = new Map()
  const published = new Map()
  const receipts = new Set()
  const events = []

  return {
    sites,
    slugs,
    published,
    events,
    async create({ uid, draft }) {
      if (siteCount >= 5) return { code: 'site-limit' }
      if (slugs.has(draft.slug)) return { code: 'slug-taken' }
      siteCount += 1
      sites.set(`${uid}/${draft.siteId}`, structuredClone(draft))
      slugs.set(draft.slug, { uid, siteId: draft.siteId })
      return structuredClone(draft)
    },
    async get({ uid, siteId }) {
      return structuredClone(sites.get(`${uid}/${siteId}`) ?? null)
    },
    async duplicate({ uid, sourceSiteId, draft }) {
      if (!sites.has(`${uid}/${sourceSiteId}`)) return { code: 'not-found' }
      return this.create({ uid, draft })
    },
    async changeSlug({ uid, siteId, slug }) {
      const site = sites.get(`${uid}/${siteId}`)
      if (!site) return { code: 'not-found' }
      if (slugs.has(slug)) return { code: 'slug-taken' }
      slugs.delete(site.slug)
      site.slug = slug
      slugs.set(slug, { uid, siteId })
      return structuredClone(site)
    },
    async publish({ uid, siteId, snapshot }) {
      const site = sites.get(`${uid}/${siteId}`)
      if (!site) return { code: 'not-found' }
      site.status = 'published'
      site.publishedRevision = site.draftRevision
      published.set(site.slug, structuredClone(snapshot))
      return { slug: site.slug, revision: site.draftRevision }
    },
    async unpublish({ uid, siteId }) {
      const site = sites.get(`${uid}/${siteId}`)
      if (!site) return { code: 'not-found' }
      site.status = 'draft'
      published.delete(site.slug)
      return { slug: site.slug }
    },
    async delete({ uid, siteId, confirmationName }) {
      const key = `${uid}/${siteId}`
      const site = sites.get(key)
      if (!site) return { code: 'not-found' }
      if (site.name !== confirmationName) return { code: 'name-mismatch' }
      sites.delete(key)
      slugs.delete(site.slug)
      published.delete(site.slug)
      siteCount -= 1
      return { deleted: true }
    },
    async recordEvent({ slug, type, blockId, receiptId }) {
      const snapshot = published.get(slug)
      if (!snapshot) return { code: 'not-found' }
      if (
        type === 'link_click' &&
        !snapshot.blocks.some(
          (block) => block.id === blockId && block.type === 'link',
        )
      ) {
        return { code: 'unknown-link' }
      }
      if (receipts.has(receiptId)) return { duplicate: true }
      receipts.add(receiptId)
      events.push({ slug, type, blockId })
      return { recorded: true }
    },
  }
}

describe('mini-site lifecycle service', () => {
  it('creates sites until the fifth-site boundary and rejects collisions', async () => {
    const store = createMemoryStore({ siteCount: 4 })
    const service = createMiniSiteService({
      store,
      createId: () => 'site-5',
      now: () => '2026-07-26T10:00:00.000Z',
    })

    await expect(
      service.createMiniSite({
        auth: { uid: 'user-1' },
        data: {
          name: 'Maya Studio',
          slug: 'maya-studio',
          templateId: 'blank',
        },
      }),
    ).resolves.toMatchObject({ siteId: 'site-5', slug: 'maya-studio' })

    await expect(
      service.createMiniSite({
        auth: { uid: 'user-1' },
        data: {
          name: 'Second',
          slug: 'second-site',
          templateId: 'blank',
        },
      }),
    ).rejects.toMatchObject({ code: 'resource-exhausted' })
  })

  it('changes slugs, publishes sanitized snapshots, and unpublishes', async () => {
    const store = createMemoryStore()
    store.sites.set('user-1/site-1', makeDraft())
    store.slugs.set('maya-studio', { uid: 'user-1', siteId: 'site-1' })
    const service = createMiniSiteService({ store })

    await expect(
      service.changeMiniSiteSlug({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1', slug: 'maya-works' },
      }),
    ).resolves.toMatchObject({ slug: 'maya-works' })
    await expect(
      service.publishMiniSite({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1' },
      }),
    ).resolves.toMatchObject({ slug: 'maya-works', revision: 1 })
    expect(store.published.get('maya-works').ownerEmail).toBeUndefined()
    await expect(
      service.unpublishMiniSite({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1' },
      }),
    ).resolves.toEqual({ slug: 'maya-works' })
    expect(store.slugs.has('maya-works')).toBe(true)
    expect(store.published.has('maya-works')).toBe(false)
  })

  it('promotes referenced assets before creating the public snapshot', async () => {
    const store = createMemoryStore()
    const draft = makeDraft({
      blocks: [
        {
          id: 'image-1',
          type: 'image',
          visible: true,
          content: {
            url: 'blob:private',
            storagePath: 'mini-site-drafts/user-1/site-1/image-1',
            alt: 'Ceramic vessel',
            caption: '',
            decorative: false,
          },
        },
      ],
    })
    store.sites.set('user-1/site-1', draft)
    store.promoteAssets = async ({ draft: source }) => ({
      ...source,
      blocks: source.blocks.map((block) => ({
        ...block,
        content: {
          ...block.content,
          url: 'https://storage.example/public/image-1.webp',
        },
      })),
    })
    const service = createMiniSiteService({ store })

    await service.publishMiniSite({
      auth: { uid: 'user-1' },
      data: { siteId: 'site-1' },
    })

    expect(
      store.published.get('maya-studio').blocks[0].content.url,
    ).toBe('https://storage.example/public/image-1.webp')
  })

  it('requires ownership and exact confirmation before deletion', async () => {
    const store = createMemoryStore()
    store.sites.set('user-1/site-1', makeDraft())
    const service = createMiniSiteService({ store })

    await expect(
      service.deleteMiniSite({
        auth: { uid: 'other-user' },
        data: { siteId: 'site-1', confirmationName: 'Maya Studio' },
      }),
    ).rejects.toMatchObject({ code: 'not-found' })
    await expect(
      service.deleteMiniSite({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1', confirmationName: 'Wrong' },
      }),
    ).rejects.toMatchObject({ code: 'failed-precondition' })
  })

  it('records valid public events once and rejects unknown links', async () => {
    const store = createMemoryStore()
    store.published.set('maya-studio', {
      blocks: [{ id: 'link-1', type: 'link', visible: true }],
    })
    const service = createMiniSiteService({ store })
    const input = {
      auth: null,
      data: {
        slug: 'maya-studio',
        type: 'link_click',
        blockId: 'link-1',
        eventId: 'event-12345678',
      },
    }

    await expect(service.recordMiniSiteEvent(input)).resolves.toEqual({
      recorded: true,
    })
    await expect(service.recordMiniSiteEvent(input)).resolves.toEqual({
      duplicate: true,
    })
    expect(store.events).toHaveLength(1)

    await expect(
      service.recordMiniSiteEvent({
        auth: null,
        data: { ...input.data, blockId: 'missing', eventId: 'event-abcdefgh' },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })
})
