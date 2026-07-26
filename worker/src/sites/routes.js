import { requireUser as requireAuthenticatedUser } from '../auth/session.js'
import { ApiError } from '../http/errors.js'
import { parseSiteId } from './domain.js'
import { createMiniSiteService } from './service.js'

const MAX_JSON_BYTES = 1024 * 1024

function notFound() {
  throw new ApiError('not_found', 'Not found.', 404)
}

function safeSiteId(value) {
  try {
    return parseSiteId(decodeURIComponent(value))
  } catch {
    throw new ApiError('invalid_argument', 'Choose a valid mini-site.', 400)
  }
}

function sitePath(pathname) {
  const match = /^\/v1\/sites\/([^/]+)(?:\/(duplicate|slug|publish|unpublish|analytics))?$/.exec(pathname)
  if (!match) return null
  return { siteId: safeSiteId(match[1]), action: match[2] ?? null }
}

export function requiresJsonSiteBody(request) {
  const { pathname } = new URL(request.url)
  if (pathname === '/v1/sites') return request.method === 'POST'
  const match = /^\/v1\/sites\/[^/]+(?:\/(duplicate|slug|publish|unpublish|analytics))?$/.exec(pathname)
  if (!match) return false
  const action = match[1] ?? null
  return (!action && ['PUT', 'DELETE'].includes(request.method))
    || (action === 'duplicate' && request.method === 'POST')
    || (action === 'slug' && request.method === 'PUT')
    || (['publish', 'unpublish'].includes(action) && request.method === 'POST')
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new ApiError('request_too_large', 'JSON request bodies must not exceed 1 MiB.', 413)
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new ApiError('request_too_large', 'JSON request bodies must not exceed 1 MiB.', 413)
  }
  if (!text.trim()) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('invalid_argument', 'Request body must contain valid JSON.', 400)
  }
}

function siteResponse(site, status = 200) {
  return Response.json({ site }, { status })
}

export function createSiteRoutes({ auth, store, service = createMiniSiteService({ store }), requireUser = requireAuthenticatedUser } = {}) {
  if (!auth) throw new TypeError('An auth instance is required.')
  if (!store) throw new TypeError('A mini-site store is required.')

  async function currentUser(request) {
    return requireUser(auth, request)
  }

  return {
    async handle(request) {
      const { pathname } = new URL(request.url)
      const path = sitePath(pathname)

      if (pathname === '/v1/sites') {
        const user = await currentUser(request)
        if (request.method === 'GET') {
          return Response.json({ sites: await store.list({ userId: user.id }), limit: 5 })
        }
        if (request.method === 'POST') {
          return siteResponse(await service.createMiniSite({ userId: user.id, data: await readJson(request) }), 201)
        }
        return notFound()
      }

      if (!path) return notFound()
      const user = await currentUser(request)
      if (!path.action && request.method === 'GET') {
        const site = await store.get({ userId: user.id, siteId: path.siteId })
        if (!site) return notFound()
        return siteResponse(site)
      }
      if (!path.action && request.method === 'PUT') {
        const body = await readJson(request)
        return siteResponse(await service.saveMiniSiteDraft({
          userId: user.id,
          data: { ...body, siteId: path.siteId },
        }))
      }
      if (!path.action && request.method === 'DELETE') {
        const body = await readJson(request)
        return Response.json(await service.deleteMiniSite({
          userId: user.id,
          data: { ...body, siteId: path.siteId },
        }))
      }
      if (path.action === 'duplicate' && request.method === 'POST') {
        const body = await readJson(request)
        return siteResponse(await service.duplicateMiniSite({
          userId: user.id,
          data: { ...body, sourceSiteId: path.siteId },
        }), 201)
      }
      if (path.action === 'slug' && request.method === 'PUT') {
        const body = await readJson(request)
        return siteResponse(await service.changeMiniSiteSlug({
          userId: user.id,
          data: { ...body, siteId: path.siteId },
        }))
      }
      if (path.action === 'publish' && request.method === 'POST') {
        const body = await readJson(request)
        return Response.json({ publication: await service.publishMiniSite({
          userId: user.id,
          data: { ...body, siteId: path.siteId },
        }) })
      }
      if (path.action === 'unpublish' && request.method === 'POST') {
        const body = await readJson(request)
        return Response.json({ publication: await service.unpublishMiniSite({
          userId: user.id,
          data: { ...body, siteId: path.siteId },
        }) })
      }
      if (path.action === 'analytics' && request.method === 'GET') {
        const analytics = await store.getAnalytics({ userId: user.id, siteId: path.siteId })
        if (analytics?.code === 'not-found') return notFound()
        return Response.json({ analytics })
      }
      return notFound()
    },
  }
}
