import { BLOCK_LIMIT, BLOCK_TYPES, normalizeDraft } from './model/miniSiteModel.js'
import { validateSlug } from './model/validation.js'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function string(value, max) {
  return typeof value === 'string' && value.length <= max ? value : null
}

function optionalString(record, key, max) {
  if (!(key in record)) return ''
  return string(record[key], max)
}

function optionalBoolean(record, key) {
  return !(key in record) || typeof record[key] === 'boolean'
    ? record[key] === true
    : null
}

function blockContent(type, content) {
  if (!isRecord(content)) return null
  const field = (key, max) => optionalString(content, key, max)
  switch (type) {
    case 'profile': {
      const avatarUrl = field('avatarUrl', 2048); const displayName = field('displayName', 120); const bio = field('bio', 600); const alt = field('alt', 200)
      return [avatarUrl, displayName, bio, alt].includes(null) ? null : { avatarUrl, displayName, bio, alt }
    }
    case 'link': {
      const label = field('label', 200); const url = field('url', 2048); const supportingText = field('supportingText', 600); const icon = field('icon', 80)
      return [label, url, supportingText, icon].includes(null) ? null : { label, url, supportingText, icon }
    }
    case 'heading': {
      const text = field('text', 600); const level = content.level ?? 2
      return text === null || !Number.isInteger(level) ? null : { text, level }
    }
    case 'paragraph': {
      const text = field('text', 4000)
      return text === null ? null : { text }
    }
    case 'image': {
      const url = field('url', 2048); const alt = field('alt', 400); const caption = field('caption', 600); const decorative = optionalBoolean(content, 'decorative')
      return [url, alt, caption, decorative].includes(null) ? null : { url, alt, caption, decorative }
    }
    case 'socials': {
      if (!Array.isArray(content.links) || content.links.length > 12) return null
      const links = content.links.map((link) => {
        if (!isRecord(link)) return null
        const network = optionalString(link, 'network', 40); const label = optionalString(link, 'label', 120); const url = optionalString(link, 'url', 2048)
        return [network, label, url].includes(null) ? null : { network, label, url }
      })
      return links.includes(null) ? null : { links }
    }
    case 'divider': {
      const style = field('style', 40); const width = content.width
      return style === null || !['string', 'number'].includes(typeof width) ? null : { style, width: typeof width === 'string' ? width : '' }
    }
    case 'spacer': {
      const size = content.size
      return !['string', 'number'].includes(typeof size) ? null : { size: typeof size === 'string' ? size : '' }
    }
    default:
      return null
  }
}

function publicBlock(block) {
  if (!isRecord(block) || !BLOCK_TYPES.includes(block.type)) return null
  const id = string(block.id, 128)
  const visible = optionalBoolean(block, 'visible')
  const content = blockContent(block.type, block.content)
  if (!id?.trim() || visible === null || !content) return null
  return { id, type: block.type, visible, content }
}

function projectedGroup(value, fields) {
  if (!isRecord(value)) return null
  const projected = {}
  for (const [key, kind] of Object.entries(fields)) {
    if (!(key in value)) continue
    if (kind === 'string' && typeof value[key] !== 'string') return null
    if (kind === 'number' && !Number.isFinite(value[key])) return null
    projected[key] = value[key]
  }
  return projected
}

function publicTheme(theme) {
  if (!isRecord(theme)) return null
  const fields = {
    background: { type: 'string', value: 'string', secondary: 'string', imageUrl: 'string' },
    colors: { text: 'string', muted: 'string', button: 'string', buttonText: 'string', buttonBorder: 'string' },
    fonts: { display: 'string', body: 'string' },
    layout: { alignment: 'string', width: 'string', density: 'string' },
    button: { style: 'string', radius: 'number', shadow: 'string' },
    profile: { shape: 'string', size: 'string' },
  }
  const projected = {}
  for (const [key, groupFields] of Object.entries(fields)) {
    if (!(key in theme)) continue
    const group = projectedGroup(theme[key], groupFields)
    if (!group) return null
    projected[key] = group
  }
  const normalized = normalizeDraft({ theme: projected }).theme
  return {
    background: normalized.background,
    colors: normalized.colors,
    fonts: normalized.fonts,
    layout: normalized.layout,
    button: normalized.button,
    profile: normalized.profile,
  }
}

function publicSeo(seo) {
  if (!isRecord(seo)) return null
  const title = optionalString(seo, 'title', 80)
  const description = optionalString(seo, 'description', 180)
  const socialImageUrl = optionalString(seo, 'socialImageUrl', 2048)
  return [title, description, socialImageUrl].includes(null)
    ? null
    : { title, description, socialImageUrl: socialImageUrl || null }
}

export function readMiniSiteBootstrap(document) {
  const element = document?.getElementById?.('mini-site-bootstrap')
  if (!element) return null

  try {
    const snapshot = JSON.parse(element.content?.textContent ?? element.textContent ?? '')
    if (!isRecord(snapshot) || snapshot.schemaVersion !== 1 || !validateSlug(snapshot.slug).valid || !Array.isArray(snapshot.blocks) || snapshot.blocks.length === 0 || snapshot.blocks.length > BLOCK_LIMIT) return null
    const blocks = snapshot.blocks.map(publicBlock)
    const theme = publicTheme(snapshot.theme)
    const seo = publicSeo(snapshot.seo)
    if (blocks.includes(null) || !theme || !seo) return null

    const draft = normalizeDraft({
      name: seo.title || snapshot.slug,
      slug: snapshot.slug,
      status: 'published',
      blocks,
      theme,
      seo: { title: seo.title, description: seo.description },
    })
    return { slug: draft.slug, blocks, theme: publicTheme(draft.theme), seo }
  } catch {
    return null
  }
}
