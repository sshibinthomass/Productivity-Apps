import {
  BLOCK_LIMIT,
  BLOCK_TYPES,
  LINK_BLOCK_LIMIT,
  normalizeDraft,
} from './miniSiteModel.js'

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'login',
  'mini-sites',
  's',
])
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const ALLOWED_IMAGE_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function normalizeSlug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export function validateSlug(value) {
  const slug = String(value ?? '').trim()
  if (
    !SLUG_PATTERN.test(slug) ||
    RESERVED_SLUGS.has(slug.toLowerCase()) ||
    slug !== slug.toLowerCase()
  ) {
    return {
      valid: false,
      value: slug,
      error:
        'Use 3–40 lowercase letters, numbers, and single hyphens between words.',
    }
  }

  return { valid: true, value: slug, error: null }
}

export function validateLinkUrl(value) {
  const input = String(value ?? '').trim()
  try {
    const url = new URL(input)
    if (!ALLOWED_SCHEMES.has(url.protocol)) throw new Error('scheme')
    return { valid: true, value: url.toString(), error: null }
  } catch {
    return {
      valid: false,
      value: input,
      error: 'Use an HTTP, HTTPS, email, or telephone link.',
    }
  }
}

export function validateImageFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Choose a JPEG, PNG, WebP, or GIF image.',
    }
  }
  if (!Number.isFinite(file.size) || file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: 'Choose an image no larger than 5 MiB.',
    }
  }
  return { valid: true, error: null }
}

function channelToLinear(channel) {
  const value = channel / 255
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
}

function hexToRgb(hex) {
  const normalized = String(hex ?? '').trim()
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null
  const expanded =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((character) => character.repeat(2))
          .join('')
      : match[1]
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

export function contrastRatio(first, second) {
  const firstRgb = hexToRgb(first)
  const secondRgb = hexToRgb(second)
  if (!firstRgb || !secondRgb) return 0

  const luminance = (rgb) =>
    rgb
      .map(channelToLinear)
      .reduce(
        (total, channel, index) =>
          total + channel * [0.2126, 0.7152, 0.0722][index],
        0,
      )

  const lighter = Math.max(luminance(firstRgb), luminance(secondRgb))
  const darker = Math.min(luminance(firstRgb), luminance(secondRgb))
  return (lighter + 0.05) / (darker + 0.05)
}

function collectContentErrors(draft, { publishing = false } = {}) {
  const errors = {}
  const blocks = Array.isArray(draft.blocks) ? draft.blocks : []

  if (blocks.length > BLOCK_LIMIT) {
    errors.blocks = `A site may contain up to ${BLOCK_LIMIT} blocks.`
  }
  if (blocks.filter(({ type }) => type === 'link').length > LINK_BLOCK_LIMIT) {
    errors.links = `A site may contain up to ${LINK_BLOCK_LIMIT} link blocks.`
  }

  for (const block of blocks) {
    if (!block || !BLOCK_TYPES.includes(block.type)) continue
    const path = `blocks.${block.id}`
    if (block.type === 'link' && block.content?.url) {
      const linkResult = validateLinkUrl(block.content.url)
      if (!linkResult.valid) errors[`${path}.url`] = linkResult.error
    }
    if (
      publishing &&
      block.visible !== false &&
      block.type === 'link' &&
      (!block.content?.label?.trim() || !block.content?.url?.trim())
    ) {
      errors[`${path}.link`] = 'Add both a label and destination.'
    }
    if (
      publishing &&
      block.visible !== false &&
      block.type === 'image' &&
      block.content?.url &&
      !block.content?.decorative &&
      !block.content?.alt?.trim()
    ) {
      errors[`${path}.alt`] =
        'Add alternative text or mark the image decorative.'
    }
  }

  return errors
}

export function validateDraft(draft) {
  const errors = collectContentErrors(draft)
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateForPublish(value) {
  const draft = normalizeDraft(value)
  draft.name = typeof value?.name === 'string' ? value.name.trim() : ''
  draft.slug = typeof value?.slug === 'string' ? value.slug.trim() : ''
  const errors = collectContentErrors(draft, { publishing: true })

  if (!draft.name) errors.name = 'Add a site name before publishing.'
  const slugResult = validateSlug(draft.slug)
  if (!slugResult.valid) errors.slug = slugResult.error
  if (!draft.blocks.some(({ visible }) => visible !== false)) {
    errors.blocks = 'Add at least one visible block before publishing.'
  }

  const background = draft.theme?.background?.value
  const colors = draft.theme?.colors ?? {}
  if (contrastRatio(colors.text, background) < 4.5) {
    errors['theme.textContrast'] =
      'Increase the contrast between the page text and background.'
  }
  if (contrastRatio(colors.buttonText, colors.button) < 4.5) {
    errors['theme.buttonContrast'] =
      'Increase the contrast between button text and button color.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

function sanitizeContent(block, assetUrls) {
  const content = structuredClone(block.content ?? {})
  if (block.type === 'image') {
    const publicUrl = assetUrls[content.storagePath]
    content.url = publicUrl ?? content.url
    delete content.storagePath
  }
  if (block.type === 'profile' && content.avatarStoragePath) {
    content.avatarUrl =
      assetUrls[content.avatarStoragePath] ?? content.avatarUrl
    delete content.avatarStoragePath
  }
  return content
}

export function sanitizePublishedSite(value, publicAssetUrls = {}) {
  const draft = normalizeDraft(value)
  return {
    schemaVersion: 1,
    siteId: typeof value.siteId === 'string' ? value.siteId : '',
    slug: draft.slug,
    blocks: draft.blocks
      .filter(({ visible }) => visible !== false)
      .map((block) => ({
        id: block.id,
        type: block.type,
        visible: true,
        content: sanitizeContent(block, publicAssetUrls),
      })),
    theme: structuredClone(draft.theme),
    seo: structuredClone(draft.seo),
    revision: draft.draftRevision,
    publishedAt: value.publishedAt ?? null,
  }
}
