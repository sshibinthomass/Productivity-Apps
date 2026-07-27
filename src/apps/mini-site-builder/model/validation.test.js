import { describe, expect, it } from 'vitest'
import { createBlock, createDraft } from './miniSiteModel.js'
import {
  contrastRatio,
  normalizeSlug,
  sanitizePublishedSite,
  validateDraft,
  validateForPublish,
  validateImageFile,
  validateLinkUrl,
  validateSlug,
} from './validation.js'

describe('slug validation', () => {
  it('normalizes human text into a predictable slug', () => {
    expect(normalizeSlug('  Maya & Studio 2026  ')).toBe('maya-studio-2026')
  })

  it.each(['ab', '-maya', 'maya-', 'maya--studio', 'account', 'mini-sites', 'verify-email', 'forgot-password', 'reset-password', 'ADMIN'])(
    'rejects an unavailable slug shape or reserved word: %s',
    (slug) => {
      expect(validateSlug(slug).valid).toBe(false)
    },
  )

  it('accepts a lowercase segmented slug', () => {
    expect(validateSlug('maya-studio')).toEqual({
      valid: true,
      value: 'maya-studio',
      error: null,
    })
  })
})

describe('link and image validation', () => {
  it.each([
    ['https://example.com/work', 'https://example.com/work'],
    ['http://localhost:5173', 'http://localhost:5173/'],
    ['mailto:hello@example.com', 'mailto:hello@example.com'],
    ['tel:+4912345678', 'tel:+4912345678'],
  ])('accepts %s', (input, expected) => {
    expect(validateLinkUrl(input)).toEqual({
      valid: true,
      value: expected,
      error: null,
    })
  })

  it.each(['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com'])(
    'rejects unsafe scheme %s',
    (input) => {
      expect(validateLinkUrl(input).valid).toBe(false)
    },
  )

  it('accepts supported image types up to 5 MiB', () => {
    expect(
      validateImageFile({ type: 'image/webp', size: 5 * 1024 * 1024 }),
    ).toEqual({ valid: true, error: null })
  })

  it('rejects unsupported or oversized images', () => {
    expect(validateImageFile({ type: 'image/svg+xml', size: 500 }).valid).toBe(
      false,
    )
    expect(
      validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })
        .valid,
    ).toBe(false)
  })
})

describe('draft and publishing validation', () => {
  it('computes the WCAG contrast ratio independently of color order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2)
  })

  it('reports malformed drafts without requiring publish-only fields', () => {
    const draft = createDraft({ name: 'Maya', slug: '', templateId: 'blank' })
    draft.blocks[1].content.url = 'javascript:alert(1)'

    expect(validateDraft(draft)).toEqual({
      valid: false,
      errors: {
        [`blocks.${draft.blocks[1].id}.url`]:
          'Use an HTTP, HTTPS, email, or telephone link.',
      },
    })
  })

  it('requires public identity, content, image alt text, and AA contrast', () => {
    const draft = createDraft({ name: '', slug: 'ab', templateId: 'blank' })
    draft.name = ''
    draft.blocks = [
      createBlock('image'),
      {
        ...createBlock('link'),
        content: {
          label: 'Open',
          url: 'https://example.com',
          supportingText: '',
          icon: '',
        },
      },
    ]
    draft.blocks[0].content.url = 'https://images.example.com/work.png'
    draft.theme.colors.text = '#777777'
    draft.theme.background.value = '#888888'
    draft.theme.colors.button = '#ffffff'
    draft.theme.colors.buttonText = '#eeeeee'

    const result = validateForPublish(draft)

    expect(result.valid).toBe(false)
    expect(result.errors).toMatchObject({
      name: 'Add a site name before publishing.',
      slug: expect.any(String),
      [`blocks.${draft.blocks[0].id}.alt`]:
        'Add alternative text or mark the image decorative.',
      'theme.textContrast': expect.any(String),
      'theme.buttonContrast': expect.any(String),
    })
  })

  it('sanitizes a public snapshot and maps private assets to public URLs', () => {
    const draft = createDraft({
      name: 'Maya Studio',
      slug: 'maya-studio',
      templateId: 'creator',
    })
    const image = createBlock('image')
    image.content = {
      url: 'blob:private',
      storagePath: 'mini-site-drafts/owner/site/asset',
      alt: 'Blue ceramic vessel',
      caption: 'Form study',
      decorative: false,
    }
    draft.blocks.push(image)
    draft.ownerId = 'secret-owner'
    draft.ownerEmail = 'owner@example.com'
    draft.analytics = { totalViews: 99 }

    const snapshot = sanitizePublishedSite(draft, {
      [image.content.storagePath]:
        'https://storage.example.com/public/vessel.webp',
    })

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      slug: 'maya-studio',
      revision: 0,
    })
    expect(snapshot.blocks.at(-1).content).toMatchObject({
      url: 'https://storage.example.com/public/vessel.webp',
      alt: 'Blue ceramic vessel',
    })
    expect(snapshot.blocks.at(-1).content.storagePath).toBeUndefined()
    expect(snapshot.ownerId).toBeUndefined()
    expect(snapshot.ownerEmail).toBeUndefined()
    expect(snapshot.analytics).toBeUndefined()
  })
})
