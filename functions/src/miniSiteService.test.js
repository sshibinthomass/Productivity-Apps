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
    async saveDraft({ uid, siteId, draft, expectedRevision }) {
      const key = `${uid}/${siteId}`
      const current = sites.get(key)
      if (!current) return { code: 'not-found' }
      if (current.draftRevision !== expectedRevision) {
        return { code: 'revision-conflict' }
      }
      const saved = {
        ...current,
        ...structuredClone(draft),
        draftRevision: current.draftRevision + 1,
      }
      sites.set(key, saved)
      return structuredClone(saved)
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
    async publish({ uid, siteId, snapshot, expectedRevision }) {
      const site = sites.get(`${uid}/${siteId}`)
      if (!site) return { code: 'not-found' }
      if (site.draftRevision !== expectedRevision) {
        return { code: 'revision-conflict' }
      }
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
          (block) =>
            block.id === blockId &&
            ['link', 'socials'].includes(block.type),
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

  it('creates meaningfully different drafts from selected templates', async () => {
    const store = createMemoryStore()
    let nextId = 0
    const service = createMiniSiteService({
      store,
      createId: () => `site-${++nextId}`,
    })

    const creator = await service.createMiniSite({
      auth: { uid: 'user-1' },
      data: {
        name: 'Creator page',
        slug: 'creator-page',
        templateId: 'creator',
      },
    })
    const bold = await service.createMiniSite({
      auth: { uid: 'user-1' },
      data: {
        name: 'Bold page',
        slug: 'bold-page',
        templateId: 'bold',
      },
    })

    expect(creator.theme).not.toEqual(bold.theme)
    expect(creator.blocks).not.toEqual(bold.blocks)
  })

  it('saves owner drafts with revision and link limits enforced', async () => {
    const store = createMemoryStore()
    const original = makeDraft()
    store.sites.set('user-1/site-1', original)
    const service = createMiniSiteService({ store })

    await expect(
      service.saveMiniSiteDraft({
        auth: { uid: 'user-1' },
        data: {
          siteId: 'site-1',
          expectedRevision: 1,
          draft: { ...original, name: 'Updated site' },
        },
      }),
    ).resolves.toMatchObject({
      name: 'Updated site',
      draftRevision: 2,
    })

    await expect(
      service.saveMiniSiteDraft({
        auth: { uid: 'user-1' },
        data: {
          siteId: 'site-1',
          expectedRevision: 2,
          draft: {
            ...original,
            blocks: Array.from({ length: 26 }, (_, index) => ({
              id: `link-${index}`,
              type: 'link',
              visible: true,
              content: { label: `Link ${index}`, url: '' },
            })),
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' })

    await expect(
      service.saveMiniSiteDraft({
        auth: { uid: 'user-1' },
        data: {
          siteId: 'site-1',
          expectedRevision: 2,
          draft: {
            ...original,
            blocks: Array.from({ length: 40 }, (_, index) => ({
              id: `paragraph-${index}`,
              type: 'paragraph',
              visible: true,
              content: { text: `Paragraph ${index}` },
            })),
          },
        },
      }),
    ).resolves.toMatchObject({ draftRevision: 3 })
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
      draft: {
        ...source,
        blocks: source.blocks.map((block) => ({
          ...block,
          content: {
            ...block.content,
            url: 'https://storage.example/public/image-1.webp',
          },
        })),
      },
      publicPaths: ['mini-site-public/site-1/1/image-1.webp'],
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

  it('does not publish incomplete drafts even when called directly', async () => {
    const store = createMemoryStore()
    store.sites.set(
      'user-1/site-1',
      makeDraft({
        blocks: [
          {
            id: 'link-1',
            type: 'link',
            visible: true,
            content: { label: '', url: '' },
          },
        ],
      }),
    )
    const service = createMiniSiteService({ store })

    await expect(
      service.publishMiniSite({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1' },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' })
    expect(store.published.size).toBe(0)
  })

  it('rejects drafts beyond the server-enforced block limit', async () => {
    const store = createMemoryStore()
    store.sites.set(
      'user-1/site-1',
      makeDraft({
        blocks: Array.from({ length: 26 }, (_, index) => ({
          id: `link-${index}`,
          type: 'link',
          visible: true,
          content: {
            label: `Link ${index}`,
            url: 'https://example.com',
          },
        })),
      }),
    )
    const service = createMiniSiteService({ store })

    await expect(
      service.publishMiniSite({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1' },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('rejects a publish when the stored draft revision changes', async () => {
    const store = createMemoryStore()
    const draft = makeDraft()
    store.sites.set('user-1/site-1', draft)
    let cleanedPaths = null
    store.promoteAssets = async () => ({
      draft,
      publicPaths: ['mini-site-public/site-1/1/image.webp'],
    })
    store.cleanupPromotedAssets = async ({ publicPaths }) => {
      cleanedPaths = publicPaths
    }
    store.publish = async () => ({ code: 'revision-conflict' })
    const service = createMiniSiteService({ store })

    await expect(
      service.publishMiniSite({
        auth: { uid: 'user-1' },
        data: { siteId: 'site-1' },
      }),
    ).rejects.toMatchObject({ code: 'aborted' })
    expect(cleanedPaths).toEqual([
      'mini-site-public/site-1/1/image.webp',
    ])
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

  it('accepts click events for a published socials block', async () => {
    const store = createMemoryStore()
    store.published.set('maya-studio', {
      blocks: [{ id: 'socials-1', type: 'socials', visible: true }],
    })
    const service = createMiniSiteService({ store })

    await expect(
      service.recordMiniSiteEvent({
        auth: null,
        data: {
          slug: 'maya-studio',
          type: 'link_click',
          blockId: 'socials-1',
          eventId: 'social-event-123456',
        },
      }),
    ).resolves.toEqual({ recorded: true })
  })
})
