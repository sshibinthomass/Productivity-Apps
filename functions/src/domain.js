const SITE_TEMPLATES = new Set([
  'creator',
  'portfolio',
  'minimal',
  'bold',
  'blank',
])
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'assets',
  'login',
  'mini-sites',
  's',
])
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/
const BLOCK_CONTENT_KEYS = {
  profile: ['avatarUrl', 'displayName', 'bio', 'alt'],
  link: ['label', 'url', 'supportingText', 'icon'],
  heading: ['text', 'level'],
  paragraph: ['text'],
  image: ['url', 'alt', 'caption', 'decorative'],
  socials: ['links'],
  divider: ['style', 'width'],
  spacer: ['size'],
}
const DEFAULT_THEME = {
  background: {
    type: 'solid',
    value: '#ffffff',
    secondary: '#ffffff',
    imageUrl: '',
  },
  colors: {
    text: '#081d21',
    muted: '#4d6265',
    button: '#081d21',
    buttonText: '#ffffff',
    buttonBorder: '#081d21',
  },
  fonts: { display: 'Sora Variable', body: 'Inter Variable' },
  layout: {
    alignment: 'center',
    width: 'medium',
    density: 'comfortable',
  },
  button: { style: 'solid', radius: 16, shadow: 'soft' },
  profile: { shape: 'circle', size: 'medium' },
}

export function functionError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function assertAuthenticated(auth) {
  if (!auth?.uid) {
    throw functionError('unauthenticated', 'Sign in to manage mini-sites.')
  }
  return auth.uid
}

export function parseSlug(value) {
  const slug = typeof value === 'string' ? value.trim() : ''
  if (
    !SLUG_PATTERN.test(slug) ||
    slug !== slug.toLowerCase() ||
    RESERVED_SLUGS.has(slug)
  ) {
    throw functionError(
      'invalid-argument',
      'Use a valid lowercase public slug.',
    )
  }
  return slug
}

function parseName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 80) {
    throw functionError(
      'invalid-argument',
      'Site names must contain 1–80 characters.',
    )
  }
  return name
}

export function parseCreateInput(value = {}) {
  const templateId =
    typeof value.templateId === 'string' ? value.templateId : ''
  if (!SITE_TEMPLATES.has(templateId)) {
    throw functionError('invalid-argument', 'Choose a supported template.')
  }
  return {
    name: parseName(value.name),
    slug: parseSlug(value.slug),
    templateId,
  }
}

export function parseSiteId(value) {
  const siteId = typeof value === 'string' ? value.trim() : ''
  if (!siteId || siteId.length > 128) {
    throw functionError('invalid-argument', 'Choose a valid mini-site.')
  }
  return siteId
}

export function parseEventInput(value = {}) {
  const type = value.type
  if (!['view', 'link_click'].includes(type)) {
    throw functionError('invalid-argument', 'Unsupported analytics event.')
  }
  const eventId =
    typeof value.eventId === 'string' ? value.eventId.trim() : ''
  if (eventId.length < 8 || eventId.length > 160) {
    throw functionError('invalid-argument', 'Invalid event identifier.')
  }
  const blockId =
    typeof value.blockId === 'string' ? value.blockId.trim() : undefined
  if (type === 'link_click' && !blockId) {
    throw functionError('invalid-argument', 'A link click needs a block ID.')
  }
  return {
    slug: parseSlug(value.slug),
    type,
    ...(blockId ? { blockId } : {}),
    eventId,
  }
}

function sanitizeUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      return ''
    }
    return url.toString()
  } catch {
    return ''
  }
}

function sanitizeBlock(block) {
  const keys = BLOCK_CONTENT_KEYS[block?.type]
  if (!keys || !block?.id || block.visible === false) return null

  const content = Object.fromEntries(
    keys
      .filter((key) => block.content?.[key] !== undefined)
      .map((key) => [key, structuredClone(block.content[key])]),
  )
  if (block.type === 'link') {
    content.url = sanitizeUrl(content.url)
  }
  if (block.type === 'socials') {
    content.links = Array.isArray(content.links)
      ? content.links
          .slice(0, 12)
          .map((link) => ({
            network: String(link.network ?? '').slice(0, 30),
            label: String(link.label ?? '').slice(0, 60),
            url: sanitizeUrl(link.url),
          }))
          .filter(({ url }) => url)
      : []
  }

  return {
    id: String(block.id),
    type: block.type,
    visible: true,
    content,
  }
}

function sanitizeTheme(value = {}) {
  return {
    background: {
      ...DEFAULT_THEME.background,
      ...(value.background ?? {}),
    },
    colors: { ...DEFAULT_THEME.colors, ...(value.colors ?? {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(value.fonts ?? {}) },
    layout: { ...DEFAULT_THEME.layout, ...(value.layout ?? {}) },
    button: { ...DEFAULT_THEME.button, ...(value.button ?? {}) },
    profile: { ...DEFAULT_THEME.profile, ...(value.profile ?? {}) },
  }
}

export function sanitizeSnapshot(draft) {
  return {
    schemaVersion: 1,
    siteId: String(draft.siteId ?? ''),
    slug: parseSlug(draft.slug),
    revision: Number.isInteger(draft.draftRevision)
      ? draft.draftRevision
      : 0,
    blocks: Array.isArray(draft.blocks)
      ? draft.blocks.map(sanitizeBlock).filter(Boolean).slice(0, 40)
      : [],
    theme: sanitizeTheme(draft.theme),
    seo: {
      title: String(draft.seo?.title ?? '').slice(0, 80),
      description: String(draft.seo?.description ?? '').slice(0, 180),
      socialImagePath:
        typeof draft.seo?.socialImagePath === 'string'
          ? draft.seo.socialImagePath
          : null,
    },
  }
}

export function createInitialDraft({
  siteId,
  name,
  slug,
  templateId,
  now,
}) {
  return {
    siteId,
    name,
    slug,
    templateId,
    status: 'draft',
    blocks: [
      {
        id: `${siteId}-profile`,
        type: 'profile',
        visible: true,
        content: {
          avatarUrl: '',
          displayName: name,
          bio: '',
          alt: '',
        },
      },
      {
        id: `${siteId}-link`,
        type: 'link',
        visible: true,
        content: {
          label: '',
          url: '',
          supportingText: '',
          icon: '',
        },
      },
    ],
    theme: structuredClone(DEFAULT_THEME),
    seo: { title: name, description: '', socialImagePath: null },
    draftRevision: 0,
    publishedRevision: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  }
}
