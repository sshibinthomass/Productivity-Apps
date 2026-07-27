import { BLOCK_TYPES, normalizeDraft } from './model/miniSiteModel.js'
import { validateSlug } from './model/validation.js'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function object(value) {
  return isRecord(value) ? value : {}
}

function text(value) {
  return typeof value === 'string' ? value : ''
}

function publicBlockContent(type, value) {
  const content = object(value)
  switch (type) {
    case 'profile':
      return { avatarUrl: text(content.avatarUrl), displayName: text(content.displayName), bio: text(content.bio), alt: text(content.alt) }
    case 'link':
      return { label: text(content.label), url: text(content.url), supportingText: text(content.supportingText), icon: text(content.icon) }
    case 'heading':
      return { text: text(content.text), level: Number(content.level) || 2 }
    case 'paragraph':
      return { text: text(content.text) }
    case 'image':
      return { url: text(content.url), alt: text(content.alt), caption: text(content.caption), decorative: content.decorative === true }
    case 'socials':
      return { links: Array.isArray(content.links) ? content.links.map((link) => ({ network: text(link?.network), label: text(link?.label), url: text(link?.url) })) : [] }
    case 'divider':
      return { style: text(content.style), width: text(content.width) }
    case 'spacer':
      return { size: text(content.size) }
    default:
      return {}
  }
}

function publicTheme(theme) {
  const normalized = normalizeDraft({ theme }).theme
  return {
    background: normalized.background,
    colors: normalized.colors,
    fonts: normalized.fonts,
    layout: normalized.layout,
    button: normalized.button,
    profile: normalized.profile,
  }
}

export function readMiniSiteBootstrap(document) {
  const element = document?.getElementById?.('mini-site-bootstrap')
  if (!element) return null

  try {
    const snapshot = JSON.parse(element.textContent ?? '')
    if (
      !isRecord(snapshot) ||
      snapshot.schemaVersion !== 1 ||
      !validateSlug(snapshot.slug).valid ||
      !Array.isArray(snapshot.blocks) ||
      !isRecord(snapshot.theme) ||
      !isRecord(snapshot.seo)
    ) return null

    const validBlocks = snapshot.blocks.filter(
      (block) => isRecord(block) && BLOCK_TYPES.includes(block.type),
    )
    if (validBlocks.length === 0) return null

    const draft = normalizeDraft({
      name: text(snapshot.seo.title) || snapshot.slug,
      slug: snapshot.slug,
      status: 'published',
      blocks: validBlocks,
      theme: snapshot.theme,
      seo: { title: text(snapshot.seo.title), description: text(snapshot.seo.description) },
    })

    return {
      slug: draft.slug,
      blocks: draft.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        visible: block.visible,
        content: publicBlockContent(block.type, block.content),
      })),
      theme: publicTheme(snapshot.theme),
      seo: {
        title: draft.seo.title,
        description: draft.seo.description,
        socialImageUrl: text(snapshot.seo.socialImageUrl) || null,
      },
    }
  } catch {
    return null
  }
}
