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
