import { cloneTemplate } from './templates.js'

export const SITE_LIMIT = 5
export const BLOCK_LIMIT = 40
export const LINK_BLOCK_LIMIT = 25
export const BLOCK_TYPES = [
  'profile',
  'link',
  'heading',
  'paragraph',
  'image',
  'socials',
  'divider',
  'spacer',
]

const blockContent = {
  profile: { avatarUrl: '', displayName: '', bio: '', alt: '' },
  link: { label: '', url: '', supportingText: '', icon: '' },
  heading: { text: '', level: 2 },
  paragraph: { text: '' },
  image: { url: '', storagePath: '', alt: '', caption: '', decorative: false },
  socials: { links: [] },
  divider: { style: 'solid', width: 'full' },
  spacer: { size: 'medium' },
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeBlock(value) {
  if (!value || !BLOCK_TYPES.includes(value.type)) {
    return null
  }

  const base = createBlock(value.type)
  return {
    ...base,
    id:
      typeof value.id === 'string' && value.id.trim()
        ? value.id
        : base.id,
    visible: value.visible !== false,
    content: {
      ...base.content,
      ...(value.content && typeof value.content === 'object'
        ? value.content
        : {}),
    },
  }
}

function normalizeBlocks(blocks) {
  const normalized = []
  let linkCount = 0

  for (const candidate of Array.isArray(blocks) ? blocks : []) {
    const block = normalizeBlock(candidate)
    if (!block) continue
    if (block.type === 'link') {
      if (linkCount >= LINK_BLOCK_LIMIT) continue
      linkCount += 1
    }
    normalized.push(block)
    if (normalized.length === BLOCK_LIMIT) break
  }

  return normalized
}

export function createBlock(type) {
  if (!BLOCK_TYPES.includes(type)) {
    throw new TypeError(`Unsupported mini-site block type: ${type}`)
  }

  return {
    id: createId(),
    type,
    visible: true,
    content: structuredClone(blockContent[type]),
  }
}

export function createDraft({ name, slug, templateId = 'blank' }) {
  const template = cloneTemplate(templateId)

  return normalizeDraft({
    name,
    slug,
    templateId: template.id,
    status: 'draft',
    blocks: template.blocks,
    theme: template.theme,
    seo: { title: name, description: '', socialImagePath: null },
    draftRevision: 0,
    publishedRevision: 0,
  })
}

export function normalizeDraft(value = {}) {
  const template = cloneTemplate(
    typeof value.templateId === 'string' ? value.templateId : 'blank',
  )
  const blocks = normalizeBlocks(value.blocks)

  return {
    name:
      typeof value.name === 'string' && value.name.trim()
        ? value.name.trim()
        : 'Untitled site',
    slug: typeof value.slug === 'string' ? value.slug.trim() : '',
    templateId: template.id,
    status: value.status === 'published' ? 'published' : 'draft',
    blocks: blocks.length > 0 ? blocks : normalizeBlocks(template.blocks),
    theme:
      value.theme && typeof value.theme === 'object'
        ? {
            ...structuredClone(template.theme),
            ...structuredClone(value.theme),
          }
        : structuredClone(template.theme),
    seo:
      value.seo && typeof value.seo === 'object'
        ? {
            title:
              typeof value.seo.title === 'string'
                ? value.seo.title
                : typeof value.name === 'string'
                  ? value.name
                  : '',
            description:
              typeof value.seo.description === 'string'
                ? value.seo.description
                : '',
            socialImagePath:
              typeof value.seo.socialImagePath === 'string'
                ? value.seo.socialImagePath
                : null,
          }
        : { title: '', description: '', socialImagePath: null },
    draftRevision: Number.isInteger(value.draftRevision)
      ? value.draftRevision
      : 0,
    publishedRevision: Number.isInteger(value.publishedRevision)
      ? value.publishedRevision
      : 0,
  }
}

export function updateBlock(blocks, blockId, patch) {
  return blocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          ...patch,
          content: patch.content
            ? { ...block.content, ...patch.content }
            : block.content,
        }
      : block,
  )
}

export function moveBlock(blocks, blockId, direction) {
  const index = blocks.findIndex(({ id }) => id === blockId)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= blocks.length) return blocks

  const next = [...blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function duplicateBlock(blocks, blockId) {
  if (blocks.length >= BLOCK_LIMIT) return blocks
  const index = blocks.findIndex(({ id }) => id === blockId)
  if (index < 0) return blocks
  const source = blocks[index]
  if (
    source.type === 'link' &&
    blocks.filter(({ type }) => type === 'link').length >= LINK_BLOCK_LIMIT
  ) {
    return blocks
  }

  const copy = { ...structuredClone(source), id: createId() }
  return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]
}

export function removeBlock(blocks, blockId) {
  return blocks.filter(({ id }) => id !== blockId)
}
