import { describe, expect, it } from 'vitest'
import {
  parseCreateInput,
  parseDraftForSave,
  parseEventInput,
  parseSiteId,
  parseSlug,
  sanitizeSnapshot,
  validatePublishableDraft,
} from '../src/sites/domain.js'

describe('mini-site domain validation', () => {
  it('accepts valid create input and normalizes its whitespace', () => {
    expect(parseCreateInput({
      name: ' Maya Studio ', slug: 'maya-studio', templateId: 'creator',
    })).toEqual({ name: 'Maya Studio', slug: 'maya-studio', templateId: 'creator' })
  })

  it.each([
    { name: '', slug: 'maya-studio', templateId: 'creator' },
    { name: 'Maya', slug: 'ab', templateId: 'creator' },
    { name: 'Maya', slug: 'admin', templateId: 'creator' },
    { name: 'Maya', slug: 'account', templateId: 'creator' },
    { name: 'Maya', slug: 'verify-email', templateId: 'creator' },
    { name: 'Maya', slug: 'Maya-studio', templateId: 'creator' },
    { name: 'Maya', slug: 'maya-studio', templateId: 'unknown' },
  ])('rejects invalid creation input: %#', (input) => {
    expect(() => parseCreateInput(input)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it.each([null, [], 'not-an-object'])('rejects malformed create payloads with a stable validation error', (input) => {
    expect(() => parseCreateInput(input)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it('validates site identifiers and public slugs', () => {
    expect(parseSiteId(' site-1 ')).toBe('site-1')
    expect(parseSlug('maya-studio')).toBe('maya-studio')
    for (const value of ['', 'a'.repeat(129)]) {
      expect(() => parseSiteId(value)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
    }
    for (const value of ['s', 'a-', 'api', 'account', 'verify-email', 'forgot-password', 'reset-password', 'Maya-Studio']) {
      expect(() => parseSlug(value)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
    }
  })

  it('enforces draft block and link limits while retaining only allowlisted draft fields', () => {
    expect(() => parseDraftForSave({
      name: 'Maya', templateId: 'blank',
      blocks: Array.from({ length: 26 }, (_, index) => ({
        id: `link-${index}`, type: 'link', content: { label: 'Link', url: '', secret: 'remove' },
      })),
    })).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
    expect(() => parseDraftForSave({
      name: 'Maya', templateId: 'blank',
      blocks: Array.from({ length: 41 }, (_, index) => ({
        id: `paragraph-${index}`, type: 'paragraph', content: { text: 'Text' },
      })),
    })).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))

    const draft = parseDraftForSave({
      name: ' Maya ', templateId: 'blank',
      blocks: [{ id: 'image-1', type: 'image', visible: false, content: {
        url: 'https://example.com/image.webp', storagePath: 'drafts/image.webp', alt: 'Image', secret: 'remove',
      } }],
      seo: { title: 'Maya', description: 'Portfolio', socialImagePath: 'social.webp' },
    })
    expect(draft).toMatchObject({ name: 'Maya', blocks: [{ id: 'image-1', visible: false, content: {
      url: 'https://example.com/image.webp', storagePath: 'drafts/image.webp', alt: 'Image',
    } }] })
    expect(draft.blocks[0].content.secret).toBeUndefined()
  })

  it.each([
    { name: 'Maya', templateId: 'blank', blocks: [null] },
    { name: 'Maya', templateId: 'blank', blocks: [{ id: 'link-1', type: 'link', content: null }] },
    { name: 'Maya', templateId: 'blank', blocks: [{ id: 'link-1', type: 'link', content: [] }] },
  ])('rejects malformed draft blocks with a stable validation error', (draft) => {
    expect(() => parseDraftForSave(draft)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it.each([
    null,
    { name: 'Maya', templateId: 'blank', blocks: [], theme: null },
    { name: 'Maya', templateId: 'blank', blocks: [], theme: { colors: null } },
    { name: 'Maya', templateId: 'blank', blocks: [], theme: { colors: [] } },
  ])('rejects malformed draft payload structures with a stable validation error', (draft) => {
    expect(() => parseDraftForSave(draft)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it('accepts supported analytics events and rejects missing link targets', () => {
    expect(parseEventInput({ slug: 'maya-studio', type: 'link_click', blockId: 'block-1', eventId: 'event-12345678' })).toEqual({
      slug: 'maya-studio', type: 'link_click', blockId: 'block-1', eventId: 'event-12345678',
    })
    for (const input of [
      { slug: 'maya-studio', type: 'signup', eventId: 'event-12345678' },
      { slug: 'maya-studio', type: 'link_click', eventId: 'event-12345678' },
      { slug: 'maya-studio', type: 'view', eventId: 'short' },
    ]) expect(() => parseEventInput(input)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it.each([null, [], 'not-an-object'])('rejects malformed event payloads with a stable validation error', (input) => {
    expect(() => parseEventInput(input)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it('sanitizes a draft into an allowlisted public snapshot', () => {
    const snapshot = sanitizeSnapshot({
      siteId: 'site-1', slug: 'maya-studio', draftRevision: 3,
      blocks: [
        { id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com', supportingText: '', icon: '', secret: 'remove' } },
        { id: 'hidden', type: 'paragraph', visible: false, content: { text: 'private draft note' } },
        { id: 'social-1', type: 'socials', visible: true, content: { links: [{ network: 'site', label: 'Site', url: 'javascript:alert(1)' }, { network: 'web', label: 'Web', url: 'https://example.com' }] } },
      ],
      theme: { background: { type: 'solid', value: '#ffffff' }, colors: { text: '#000000' }, injected: 'remove' },
      seo: { title: 'Maya Studio', description: 'Selected work', socialImageUrl: 'https://links.shibinthomas.com/assets/site-1/3/asset-1', secret: 'remove' }, ownerEmail: 'private@example.com',
    })
    expect(snapshot).toMatchObject({ schemaVersion: 1, siteId: 'site-1', slug: 'maya-studio', revision: 3, blocks: [
      { id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: 'https://example.com/' } },
      { id: 'social-1', type: 'socials', content: { links: [{ network: 'web', label: 'Web', url: 'https://example.com/' }] } },
    ], theme: { background: { type: 'solid', value: '#ffffff', secondary: '#ffffff', imageUrl: '' }, colors: { text: '#000000' } }, seo: { title: 'Maya Studio', description: 'Selected work', socialImageUrl: 'https://links.shibinthomas.com/assets/site-1/3/asset-1' } })
    expect(snapshot.ownerEmail).toBeUndefined()
    expect(snapshot.theme.injected).toBeUndefined()
  })

  it('drops malformed social entries while sanitizing public snapshots', () => {
    expect(sanitizeSnapshot({
      slug: 'maya-studio',
      blocks: [{ id: 'social-1', type: 'socials', visible: true, content: {
        links: [null, { network: 'Web', label: 'Portfolio', url: 'https://example.com' }],
      } }],
    }).blocks[0].content.links).toEqual([
      { network: 'Web', label: 'Portfolio', url: 'https://example.com/' },
    ])
  })

  it.each([
    null,
    { slug: 'maya-studio', theme: null },
    { slug: 'maya-studio', theme: { background: [] } },
  ])('rejects malformed snapshot structures with a stable validation error', (draft) => {
    expect(() => sanitizeSnapshot(draft)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it('rejects incomplete visible links and accessible images before publishing', () => {
    for (const blocks of [
      [{ id: 'link-1', type: 'link', visible: true, content: { label: 'Portfolio', url: '' } }],
      [{ id: 'image-1', type: 'image', visible: true, content: { url: 'https://example.com/image.webp', decorative: false, alt: '' } }],
    ]) expect(() => validatePublishableDraft({ name: 'Maya Studio', slug: 'maya-studio', blocks })).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it.each([
    { name: {}, slug: 'maya-studio', blocks: [] },
    { name: 'Maya Studio', slug: 'maya-studio', blocks: [{ id: 'link-1', type: 'link', visible: true, content: { label: {}, url: 'https://example.com' } }] },
    { name: 'Maya Studio', slug: 'maya-studio', blocks: [{ id: 'image-1', type: 'image', visible: true, content: { url: 'https://example.com/image.webp', alt: {}, decorative: false } }] },
  ])('rejects non-string publishable text with a stable validation error', (draft) => {
    expect(() => validatePublishableDraft(draft)).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })

  it('rejects malformed published blocks with a stable validation error', () => {
    for (const blocks of [
      [null],
      [{ id: 'link-1', type: 'link', visible: true, content: null }],
    ]) expect(() => validatePublishableDraft({ name: 'Maya Studio', slug: 'maya-studio', blocks })).toThrowError(expect.objectContaining({ code: 'invalid_argument' }))
  })
})
