export const publicMiniSiteHost = 'links.shibinthomas.com'

export function isPublicMiniSiteHost(host, document = globalThis.document) {
  return String(host ?? '').toLowerCase().split(':')[0] === publicMiniSiteHost
    || Boolean(document?.getElementById?.('mini-site-bootstrap'))
}
