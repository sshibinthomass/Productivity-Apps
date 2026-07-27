export const publicMiniSiteHost = 'links.shibinthomas.com'

export function isPublicMiniSiteHost(host) {
  return String(host ?? '').toLowerCase().split(':')[0] === publicMiniSiteHost
}
