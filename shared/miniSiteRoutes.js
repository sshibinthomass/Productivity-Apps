// Public mini-sites share their host with the application shell. Keep this
// contract framework-neutral so client-side hints and Worker enforcement agree.
export const reservedMiniSiteSlugs = new Set([
  'account', 'admin', 'api', 'assets', 'auth', 'brand', 'cdn-cgi', 'favicon.svg', 'fonts',
  'forgot-password', 'index.html', 'login', 'mini-sites', 'privacy',
  'reset-password', 's', 'terms', 'v1', 'verify-email',
  'multi-link-opener', 'json-formatter', 'text-comparison', 'qr-generator',
])

export function isReservedMiniSiteSlug(slug) {
  return reservedMiniSiteSlugs.has(String(slug ?? '').toLowerCase())
}
