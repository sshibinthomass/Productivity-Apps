const exactStaticShellPaths = new Set(['/', '/index.html', '/favicon.svg', '/404.html'])
const staticShellPrefixes = ['/assets/', '/fonts/', '/brand/']

export function isStaticShellPath(pathname) {
  return exactStaticShellPaths.has(pathname)
    || staticShellPrefixes.some((prefix) => pathname.startsWith(prefix))
}
