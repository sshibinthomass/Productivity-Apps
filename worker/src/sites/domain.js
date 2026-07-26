import { ApiError } from '../http/errors.js'

const SITE_TEMPLATES = new Set(['creator', 'portfolio', 'minimal', 'bold', 'blank'])
const RESERVED_SLUGS = new Set(['admin', 'api', 'assets', 'login', 'mini-sites', 's'])
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/
const BLOCK_CONTENT_KEYS = {
  profile: ['avatarUrl', 'avatarStoragePath', 'displayName', 'bio', 'alt'],
  link: ['label', 'url', 'supportingText', 'icon'], heading: ['text', 'level'], paragraph: ['text'],
  image: ['url', 'alt', 'caption', 'decorative'], socials: ['links'], divider: ['style', 'width'], spacer: ['size'],
}
const DRAFT_BLOCK_CONTENT_KEYS = { ...BLOCK_CONTENT_KEYS, image: [...BLOCK_CONTENT_KEYS.image, 'storagePath'] }
const DEFAULT_THEME = {
  background: { type: 'solid', value: '#ffffff', secondary: '#ffffff', imageUrl: '' },
  colors: { text: '#081d21', muted: '#4d6265', button: '#081d21', buttonText: '#ffffff', buttonBorder: '#081d21' },
  fonts: { display: 'Sora Variable', body: 'Inter Variable' }, layout: { alignment: 'center', width: 'medium', density: 'comfortable' },
  button: { style: 'solid', radius: 16, shadow: 'soft' }, profile: { shape: 'circle', size: 'medium' },
}

export function siteError(code, message, status = 400) {
  return new ApiError(code === 'invalid-argument' ? 'invalid_argument' : code, message, status)
}

export function requireUserId(userId) {
  if (!userId) throw siteError('unauthenticated', 'Sign in to manage mini-sites.', 401)
  return userId
}

function profileBlock(displayName, bio) {
  return { type: 'profile', visible: true, content: { avatarUrl: '', displayName, bio, alt: '' } }
}

function linkBlock(label) {
  return { type: 'link', visible: true, content: { label, url: '', supportingText: '', icon: '' } }
}

function createTemplatePreset(templateId, name) {
  const creatorTheme = { ...structuredClone(DEFAULT_THEME), background: { type: 'gradient', value: '#e9e5ff', secondary: '#d8f8f2', imageUrl: '' } }
  const presets = {
    creator: { theme: creatorTheme, blocks: [profileBlock(name, 'Creator, maker, and curious human.'), linkBlock('My latest work'), linkBlock('Say hello')] },
    portfolio: { theme: { ...structuredClone(DEFAULT_THEME), background: { type: 'solid', value: '#f4fbfa', secondary: '#f4fbfa', imageUrl: '' }, colors: { text: '#081d21', muted: '#4d6265', button: '#ffffff', buttonText: '#081d21', buttonBorder: '#9bb5b2' }, layout: { alignment: 'left', width: 'wide', density: 'spacious' }, button: { style: 'outline', radius: 8, shadow: 'none' } }, blocks: [profileBlock(name, 'Selected work and useful links.'), { type: 'heading', visible: true, content: { text: 'Selected work', level: 2 } }, linkBlock('View project')] },
    minimal: { theme: { ...structuredClone(DEFAULT_THEME), colors: { text: '#162326', muted: '#667477', button: '#ffffff', buttonText: '#162326', buttonBorder: '#cad6d4' }, layout: { alignment: 'center', width: 'narrow', density: 'compact' }, button: { style: 'outline', radius: 999, shadow: 'none' } }, blocks: [profileBlock(name, 'A short introduction goes here.'), linkBlock('Featured link')] },
    bold: { theme: { ...structuredClone(DEFAULT_THEME), background: { type: 'solid', value: '#171033', secondary: '#171033', imageUrl: '' }, colors: { text: '#ffffff', muted: '#c9c1ed', button: '#f4b942', buttonText: '#171033', buttonBorder: '#f4b942' }, layout: { alignment: 'left', width: 'wide', density: 'comfortable' }, button: { style: 'solid', radius: 2, shadow: 'strong' }, profile: { shape: 'square', size: 'large' } }, blocks: [profileBlock(name, 'Put the strongest idea first.'), linkBlock('Explore the work')] },
    blank: { theme: { ...structuredClone(DEFAULT_THEME), background: { type: 'solid', value: '#f4fbfa', secondary: '#f4fbfa', imageUrl: '' } }, blocks: [profileBlock(name, ''), linkBlock('')] },
  }
  return structuredClone(presets[templateId] ?? presets.blank)
}

export function parseSlug(value) {
  const slug = typeof value === 'string' ? value.trim() : ''
  if (!SLUG_PATTERN.test(slug) || slug !== slug.toLowerCase() || RESERVED_SLUGS.has(slug)) throw siteError('invalid-argument', 'Use a valid lowercase public slug.')
  return slug
}

function parseName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 80) throw siteError('invalid-argument', 'Site names must contain 1–80 characters.')
  return name
}

export function parseCreateInput(value = {}) {
  const templateId = typeof value.templateId === 'string' ? value.templateId : ''
  if (!SITE_TEMPLATES.has(templateId)) throw siteError('invalid-argument', 'Choose a supported template.')
  return { name: parseName(value.name), slug: parseSlug(value.slug), templateId }
}

export function parseSiteId(value) {
  const siteId = typeof value === 'string' ? value.trim() : ''
  if (!siteId || siteId.length > 128) throw siteError('invalid-argument', 'Choose a valid mini-site.')
  return siteId
}

function sanitizeTheme(value = {}) {
  return {
    background: { ...DEFAULT_THEME.background, ...(value.background ?? {}) }, colors: { ...DEFAULT_THEME.colors, ...(value.colors ?? {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(value.fonts ?? {}) }, layout: { ...DEFAULT_THEME.layout, ...(value.layout ?? {}) },
    button: { ...DEFAULT_THEME.button, ...(value.button ?? {}) }, profile: { ...DEFAULT_THEME.profile, ...(value.profile ?? {}) },
  }
}

export function parseDraftForSave(value = {}) {
  const templateId = typeof value.templateId === 'string' ? value.templateId : ''
  const blocks = Array.isArray(value.blocks) ? value.blocks : []
  if (!SITE_TEMPLATES.has(templateId)) throw siteError('invalid-argument', 'Choose a supported template.')
  if (blocks.length > 40 || blocks.filter(({ type }) => type === 'link').length > 25) throw siteError('invalid-argument', 'A mini-site may contain up to 40 blocks and 25 links.')
  const normalizedBlocks = blocks.map((block) => {
    const keys = DRAFT_BLOCK_CONTENT_KEYS[block?.type]
    const id = typeof block?.id === 'string' ? block.id.trim() : ''
    if (!keys || !id || id.length > 128 || typeof block.content !== 'object') throw siteError('invalid-argument', 'The draft contains an invalid block.')
    const content = Object.fromEntries(keys.filter((key) => block.content[key] !== undefined).map((key) => [key, structuredClone(block.content[key])]))
    if (block.type === 'socials') content.links = Array.isArray(content.links) ? content.links.slice(0, 12) : []
    return { id, type: block.type, visible: block.visible !== false, content }
  })
  return { name: parseName(value.name), templateId, blocks: normalizedBlocks, theme: sanitizeTheme(value.theme), seo: { title: String(value.seo?.title ?? '').slice(0, 80), description: String(value.seo?.description ?? '').slice(0, 180), socialImagePath: typeof value.seo?.socialImagePath === 'string' ? value.seo.socialImagePath : null } }
}

export function parseEventInput(value = {}) {
  const type = value.type
  if (!['view', 'link_click'].includes(type)) throw siteError('invalid-argument', 'Unsupported analytics event.')
  const eventId = typeof value.eventId === 'string' ? value.eventId.trim() : ''
  if (eventId.length < 8 || eventId.length > 160) throw siteError('invalid-argument', 'Invalid event identifier.')
  const blockId = typeof value.blockId === 'string' ? value.blockId.trim() : undefined
  if (type === 'link_click' && !blockId) throw siteError('invalid-argument', 'A link click needs a block ID.')
  return { slug: parseSlug(value.slug), type, ...(blockId ? { blockId } : {}), eventId }
}

function sanitizeUrl(value) {
  try { const url = new URL(String(value ?? '')); return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.toString() : '' } catch { return '' }
}

function sanitizeBlock(block) {
  const keys = BLOCK_CONTENT_KEYS[block?.type]
  if (!keys || !block?.id || block.visible === false) return null
  const content = Object.fromEntries(keys.filter((key) => block.content?.[key] !== undefined).map((key) => [key, structuredClone(block.content[key])]))
  if (block.type === 'link') content.url = sanitizeUrl(content.url)
  if (block.type === 'socials') content.links = Array.isArray(content.links) ? content.links.slice(0, 12).map((link) => ({ network: String(link.network ?? '').slice(0, 30), label: String(link.label ?? '').slice(0, 60), url: sanitizeUrl(link.url) })).filter(({ url }) => url) : []
  if (block.type === 'profile') delete content.avatarStoragePath
  return { id: String(block.id), type: block.type, visible: true, content }
}

export function validatePublishableDraft(draft) {
  if (!draft?.name?.trim()) throw siteError('invalid-argument', 'Add a site name before publishing.')
  parseSlug(draft.slug)
  const visibleBlocks = Array.isArray(draft.blocks) ? draft.blocks.filter(({ visible }) => visible !== false) : []
  if (!visibleBlocks.length) throw siteError('invalid-argument', 'Add at least one visible block before publishing.')
  if (visibleBlocks.length > 40 || visibleBlocks.filter(({ type }) => type === 'link').length > 25) throw siteError('invalid-argument', 'A mini-site may contain up to 40 blocks and 25 links.')
  for (const block of visibleBlocks) {
    if (block.type === 'link' && (!block.content?.label?.trim() || !sanitizeUrl(block.content?.url))) throw siteError('invalid-argument', 'Every visible link needs a label and valid destination.')
    if (block.type === 'image' && block.content?.url && !block.content?.decorative && !block.content?.alt?.trim()) throw siteError('invalid-argument', 'Every visible image needs alternative text or must be decorative.')
  }
  return draft
}

export function sanitizeSnapshot(draft) {
  return { schemaVersion: 1, siteId: String(draft.siteId ?? ''), slug: parseSlug(draft.slug), revision: Number.isInteger(draft.draftRevision) ? draft.draftRevision : 0, blocks: Array.isArray(draft.blocks) ? draft.blocks.map(sanitizeBlock).filter(Boolean).slice(0, 40) : [], theme: sanitizeTheme(draft.theme), seo: { title: String(draft.seo?.title ?? '').slice(0, 80), description: String(draft.seo?.description ?? '').slice(0, 180), socialImagePath: typeof draft.seo?.socialImagePath === 'string' ? draft.seo.socialImagePath : null } }
}

export function createInitialDraft({ siteId, name, slug, templateId, now }) {
  const preset = createTemplatePreset(templateId, name)
  return { siteId, name, slug, templateId, status: 'draft', blocks: preset.blocks.map((block, index) => ({ ...block, id: `${siteId}-${block.type}-${index + 1}` })), theme: preset.theme, seo: { title: name, description: '', socialImagePath: null }, draftRevision: 0, publishedRevision: 0, createdAt: now, updatedAt: now, publishedAt: null }
}
