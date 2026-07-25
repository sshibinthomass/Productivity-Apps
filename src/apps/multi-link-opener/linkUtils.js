const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:'])

export const MAX_ENTRIES = 100
export const MAX_URL_LENGTH = 2048

export const INVALID_REASON_MESSAGES = {
  'empty-after-cleanup': 'Nothing remains after cleanup.',
  'email-address': 'This looks like an email address, not a web link.',
  'internal-whitespace': 'Web links cannot contain spaces.',
  'unsupported-protocol': 'Only HTTP and HTTPS links are supported.',
  credentials: 'Links containing a username or password are not allowed.',
  'too-long': 'This link exceeds the 2,048-character limit.',
  'invalid-url': 'This is not a valid web address.',
}

const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g
const LIST_MARKER = /^[-*\u2022]\s+/
const SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const EMAIL_ADDRESS = /^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/
const HOST_WITH_PORT =
  /^(?:localhost|(?:[^/:]+\.)+[^/:]+|\d{1,3}(?:\.\d{1,3}){3}|\[[^\]]+\]):\d+(?:[/?#]|$)/i
const WRAPPERS = new Map([
  ['"', '"'],
  ["'", "'"],
  ['<', '>'],
  ['(', ')'],
  ['[', ']'],
])

function isBareIpv6Literal(value) {
  if (!value.startsWith('[') || !value.endsWith(']')) {
    return false
  }

  try {
    const url = new URL(`https://${value}`)

    return url.hostname.startsWith('[') && url.hostname.endsWith(']')
  } catch {
    return false
  }
}

function cleanEntry(value) {
  const withoutInvisibleCharacters = value.replace(INVISIBLE_CHARACTERS, '')
  const withoutListMarker = withoutInvisibleCharacters.replace(LIST_MARKER, '')
  const trimmed = withoutListMarker.trim()
  const closingWrapper = WRAPPERS.get(trimmed[0])
  const unwrapped =
    closingWrapper &&
    trimmed.endsWith(closingWrapper) &&
    !isBareIpv6Literal(trimmed)
      ? trimmed.slice(1, -1)
      : trimmed

  return unwrapped.trim()
}

function hasMatchingWrapperPair(value) {
  return (
    WRAPPERS.get(value[0]) === value.at(-1) && !isBareIpv6Literal(value)
  )
}

export function normalizeUrl(value) {
  const trimmed = value.trim()

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  return HOST_WITH_PORT.test(trimmed) || !SCHEME.test(trimmed)
    ? `https://${trimmed}`
    : trimmed
}

export function parseLinks(value) {
  const entries = value
    .split(/\r?\n/)
    .map((source) => ({ source, original: source.trim() }))
    .filter(({ original }) => original)

  if (entries.length > MAX_ENTRIES) {
    return {
      validUrls: [],
      invalidEntries: [],
      adjustedEntries: [],
      duplicateCount: 0,
      entryCount: entries.length,
      limitError: 'You can open up to 100 links at a time.',
    }
  }

  const validUrls = []
  const invalidEntries = []
  const adjustedEntries = []
  const seenUrls = new Set()
  let duplicateCount = 0
  const reject = (value, reason) => {
    invalidEntries.push({ value, reason })
  }

  for (const { source, original } of entries) {
    const entry = cleanEntry(source)

    if (!entry) {
      reject(original, 'empty-after-cleanup')
      continue
    }

    if (EMAIL_ADDRESS.test(entry)) {
      reject(original, 'email-address')
      continue
    }

    if (/\s/.test(entry)) {
      reject(original, 'internal-whitespace')
      continue
    }

    try {
      const url = new URL(normalizeUrl(entry))

      if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
        reject(original, 'unsupported-protocol')
        continue
      }

      if (!url.hostname.trim() || hasMatchingWrapperPair(entry)) {
        reject(original, 'invalid-url')
        continue
      }

      if (url.username || url.password) {
        reject(original, 'credentials')
        continue
      }

      const serializedUrl = url.href

      if (serializedUrl.length > MAX_URL_LENGTH) {
        reject(original, 'too-long')
        continue
      }

      if (serializedUrl !== original) {
        adjustedEntries.push({ original, normalized: serializedUrl })
      }

      if (seenUrls.has(serializedUrl)) {
        duplicateCount += 1
        continue
      }

      seenUrls.add(serializedUrl)
      validUrls.push(serializedUrl)
    } catch {
      reject(original, 'invalid-url')
    }
  }

  return {
    validUrls,
    invalidEntries,
    adjustedEntries,
    duplicateCount,
    entryCount: entries.length,
    limitError: null,
  }
}

export function submitLinks(text, delaySeconds, open = openLinks) {
  const parsed = parseLinks(text)
  const normalizedDelay = Math.min(
    60,
    Math.max(0, Math.floor(Number(delaySeconds) || 0)),
  )
  const opened = parsed.limitError
    ? { openedCount: 0, blockedCount: 0 }
    : open(parsed.validUrls, {
        delayMs: normalizedDelay * 1000,
      })

  return { ...parsed, ...opened, delaySeconds: normalizedDelay }
}

export function openLinks(
  urls,
  {
    opener = window.open.bind(window),
    scheduler = window.setTimeout.bind(window),
    delayMs = 0,
  } = {},
) {
  const interval = Math.max(0, Number(delayMs) || 0)
  const reservations = []
  let blockedCount = 0

  for (const url of urls) {
    const openedWindow = opener('', '_blank')

    if (!openedWindow) {
      blockedCount += 1
      continue
    }

    try {
      openedWindow.opener = null
      const referrerPolicy = openedWindow.document.createElement('meta')
      referrerPolicy.name = 'referrer'
      referrerPolicy.content = 'no-referrer'
      openedWindow.document.head.append(referrerPolicy)
    } catch {
      // Some browsers restrict access to the reserved tab's initial
      // document. Navigation still proceeds through the fallback below.
    }

    reservations.push({ openedWindow, url })
  }

  for (const [index, reservation] of reservations.entries()) {
    const navigate = () => {
      try {
        reservation.openedWindow.location.replace(reservation.url)
      } catch {
        reservation.openedWindow.location.href = reservation.url
      }
    }

    if (index === 0 || interval === 0) {
      navigate()
    } else {
      scheduler(navigate, index * interval)
    }
  }

  return { openedCount: reservations.length, blockedCount }
}
