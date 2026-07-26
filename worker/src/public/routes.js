import { ApiError, errorResponse } from '../http/errors.js'
import { renderPublicPage } from './renderPage.js'

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'
const ASSET_CACHE = 'public, max-age=31536000, immutable'
const blockKeys = {
  profile: ['displayName', 'bio', 'avatarUrl', 'alt'], link: ['label', 'url', 'supportingText', 'icon'], heading: ['text', 'level'],
  paragraph: ['text'], image: ['url', 'alt', 'caption', 'decorative'], socials: ['links'], divider: ['style', 'width'], spacer: ['size'],
}

function notFound() {
  return new Response('Not found.', { status: 404, headers: { 'Cache-Control': 'no-store' } })
}

function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }

function publicBlock(block) {
  const keys = blockKeys[block?.type]
  if (!keys || block?.visible === false || typeof block.id !== 'string' || !isRecord(block.content)) return null
  const content = {}
  for (const key of keys) if (block.content[key] !== undefined) content[key] = structuredClone(block.content[key])
  if (block.type === 'socials') content.links = Array.isArray(content.links) ? content.links.map((link) => ({
    network: String(link?.network ?? ''), label: String(link?.label ?? ''), url: String(link?.url ?? ''),
  })) : []
  return { id: block.id, type: block.type, visible: true, content }
}

function publicSite(snapshot, slug, revision) {
  const seo = isRecord(snapshot?.seo) ? snapshot.seo : {}
  return {
    schemaVersion: 1, slug, revision,
    blocks: Array.isArray(snapshot?.blocks) ? snapshot.blocks.map(publicBlock).filter(Boolean) : [],
    theme: isRecord(snapshot?.theme) ? structuredClone(snapshot.theme) : {},
    seo: {
      title: typeof seo.title === 'string' ? seo.title.slice(0, 80) : '',
      description: typeof seo.description === 'string' ? seo.description.slice(0, 180) : '',
      socialImageUrl: typeof seo.socialImageUrl === 'string' ? seo.socialImageUrl : null,
    },
  }
}

function assetPath(pathname) {
  const match = /^\/assets\/([^/]+)\/(\d+)\/([^/]+)$/.exec(pathname)
  return match ? { siteId: decodeURIComponent(match[1]), revision: Number(match[2]), assetId: decodeURIComponent(match[3]) } : null
}

async function parseBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) {
    throw new ApiError('unsupported_media_type', 'Use application/json for this request.', 415)
  }
  try { return await request.json() } catch { throw new ApiError('invalid_argument', 'Request body must contain valid JSON.', 400) }
}

export function createPublicRoutes({ db, assets, staticAssets, analytics, origin }) {
  async function findSite(slug) {
    const row = await db.prepare('SELECT slug, snapshot_json, revision FROM published_sites WHERE slug = ?1 LIMIT 1').bind(slug).first()
    return row ? publicSite(JSON.parse(row.snapshot_json), row.slug, row.revision) : null
  }

  async function staticFallback(request) {
    return staticAssets?.fetch ? staticAssets.fetch(request) : notFound()
  }

  return {
    async handle(request) {
      const { pathname } = new URL(request.url)
      const asset = assetPath(pathname)
      if (asset) {
        const object = await assets.getPublic(asset)
        if (!object) return notFound()
        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
        headers.set('Cache-Control', ASSET_CACHE)
        headers.set('X-Content-Type-Options', 'nosniff')
        return new Response(object.body, { headers })
      }
      const jsonMatch = /^\/v1\/public\/sites\/([^/]+)$/.exec(pathname)
      const eventMatch = /^\/v1\/public\/sites\/([^/]+)\/events$/.exec(pathname)
      if (eventMatch) {
        if (request.method !== 'POST') return notFound()
        try { return Response.json(await analytics.record({ slug: decodeURIComponent(eventMatch[1]), data: await parseBody(request) }), { headers: { 'Cache-Control': 'no-store' } }) } catch (error) {
          const response = errorResponse(error)
          response.headers.set('Cache-Control', 'no-store')
          return response
        }
      }
      if (jsonMatch) {
        if (request.method !== 'GET') return notFound()
        const site = await findSite(decodeURIComponent(jsonMatch[1]))
        return site ? Response.json({ site }, { headers: { 'Cache-Control': PUBLIC_CACHE } }) : notFound()
      }
      if (pathname === '/' || pathname === '/index.html' || pathname.startsWith('/assets/')) return staticFallback(request)
      if (request.method !== 'GET') return notFound()
      const slug = pathname.slice(1)
      if (!slug || slug.includes('/')) return notFound()
      const site = await findSite(decodeURIComponent(slug))
      if (!site) return notFound()
      const shell = await staticFallback(new Request(`${origin}/index.html`))
      if (!shell.ok) return new Response('Public app shell is unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } })
      return new Response(renderPublicPage({ document: await shell.text(), site, origin }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': PUBLIC_CACHE },
      })
    },
  }
}
