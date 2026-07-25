const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:'])

export function normalizeUrl(value) {
  const trimmed = value.trim()

  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
}

export function parseLinks(value) {
  const entries = value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const validUrls = []
  const invalidEntries = []
  const seenUrls = new Set()
  let duplicateCount = 0

  for (const entry of entries) {
    try {
      const url = new URL(normalizeUrl(entry))

      if (!SUPPORTED_PROTOCOLS.has(url.protocol) || !url.hostname.trim()) {
        invalidEntries.push(entry)
        continue
      }

      const serializedUrl = url.href

      if (seenUrls.has(serializedUrl)) {
        duplicateCount += 1
        continue
      }

      seenUrls.add(serializedUrl)
      validUrls.push(serializedUrl)
    } catch {
      invalidEntries.push(entry)
    }
  }

  return {
    validUrls,
    invalidEntries,
    duplicateCount,
    entryCount: entries.length,
  }
}

export function openLinks(urls, opener = window.open.bind(window)) {
  let openedCount = 0
  let blockedCount = 0

  for (const url of urls) {
    const openedWindow = opener('', '_blank')

    if (!openedWindow) {
      blockedCount += 1
      continue
    }

    openedCount += 1

    try {
      openedWindow.opener = null
      const referrerPolicy = openedWindow.document.createElement('meta')
      referrerPolicy.name = 'referrer'
      referrerPolicy.content = 'no-referrer'
      openedWindow.document.head.append(referrerPolicy)
      openedWindow.location.replace(url)
    } catch {
      // The reserved about:blank tab should be same-origin. This fallback
      // still navigates if a browser limits access to its initial document.
      openedWindow.location.href = url
    }
  }

  return { openedCount, blockedCount }
}
