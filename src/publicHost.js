export const publicMiniSiteHost = 'links.shibinthomas.com'

function exactHostname(host) {
  const value = String(host ?? '').toLowerCase()
  const ipv6 = /^\[::1\](?::\d+)?$/.exec(value)
  if (ipv6) return '[::1]'
  return /^([a-z0-9.-]+)(?::\d+)?$/.exec(value)?.[1] ?? null
}

export function isPublicMiniSiteHost(host, document = globalThis.document) {
  const hostname = exactHostname(host)
  return hostname === publicMiniSiteHost
    || (['localhost', '127.0.0.1', '[::1]'].includes(hostname) && Boolean(document?.getElementById?.('mini-site-bootstrap')))
}
