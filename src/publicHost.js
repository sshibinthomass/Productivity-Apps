export const publicMiniSiteHost = 'links.shibinthomas.com'

function loopbackHost(host) {
  const value = String(host ?? '').toLowerCase()
  const hostname = value.startsWith('[') ? value.slice(0, value.indexOf(']') + 1) : value.split(':')[0]
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}

export function isPublicMiniSiteHost(host, document = globalThis.document) {
  const value = String(host ?? '').toLowerCase()
  const hostname = value.startsWith('[') ? value.slice(0, value.indexOf(']') + 1) : value.split(':')[0]
  return hostname === publicMiniSiteHost
    || (loopbackHost(hostname) && Boolean(document?.getElementById?.('mini-site-bootstrap')))
}
