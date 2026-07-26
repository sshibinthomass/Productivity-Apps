import { ApiError, errorResponse } from '../http/errors.js'
import { renderPublicPage } from './renderPage.js'

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'
const ASSET_CACHE = 'public, max-age=31536000, immutable'
const MAX_EVENT_BYTES = 64 * 1024
const CSP = "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"

function text(value, max = 400) { return typeof value === 'string' ? value.slice(0, max) : '' }
function number(value) { return Number.isFinite(value) ? value : 0 }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {} }
function headers(cache) { return { 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': CSP } }
function notFound(status = 404) { return new Response('Not found.', { status, headers: headers('no-store') }) }

function publicBlock(block) {
  const content = record(block?.content)
  if (block?.visible === false || typeof block?.id !== 'string') return null
  const base = { id: block.id.slice(0, 128), type: block.type, visible: true }
  if (block.type === 'profile') return { ...base, content: { displayName: text(content.displayName, 120), bio: text(content.bio, 600), avatarUrl: text(content.avatarUrl, 2048), alt: text(content.alt, 200) } }
  if (block.type === 'link') return { ...base, content: { label: text(content.label, 200), url: text(content.url, 2048), supportingText: text(content.supportingText, 600), icon: text(content.icon, 80) } }
  if (block.type === 'heading') return { ...base, content: { text: text(content.text, 600), level: Number.isInteger(content.level) ? content.level : 2 } }
  if (block.type === 'paragraph') return { ...base, content: { text: text(content.text, 4000) } }
  if (block.type === 'image') return { ...base, content: { url: text(content.url, 2048), alt: text(content.alt, 400), caption: text(content.caption, 600), decorative: content.decorative === true } }
  if (block.type === 'socials') return { ...base, content: { links: Array.isArray(content.links) ? content.links.slice(0, 12).map((link) => ({ network: text(link?.network, 40), label: text(link?.label, 120), url: text(link?.url, 2048) })) : [] } }
  if (block.type === 'divider') return { ...base, content: { style: text(content.style, 40), width: number(content.width) } }
  if (block.type === 'spacer') return { ...base, content: { size: number(content.size) } }
  return null
}

function publicTheme(value) {
  const theme = record(value); const background = record(theme.background); const colors = record(theme.colors); const fonts = record(theme.fonts); const layout = record(theme.layout); const button = record(theme.button); const profile = record(theme.profile)
  return { background: { type: text(background.type, 40), value: text(background.value, 200), secondary: text(background.secondary, 200), imageUrl: text(background.imageUrl, 2048) }, colors: { text: text(colors.text, 100), muted: text(colors.muted, 100), button: text(colors.button, 100), buttonText: text(colors.buttonText, 100), buttonBorder: text(colors.buttonBorder, 100) }, fonts: { display: text(fonts.display, 120), body: text(fonts.body, 120) }, layout: { alignment: text(layout.alignment, 40), width: text(layout.width, 40), density: text(layout.density, 40) }, button: { style: text(button.style, 40), radius: number(button.radius), shadow: text(button.shadow, 40) }, profile: { shape: text(profile.shape, 40), size: text(profile.size, 40) } }
}

function publicSite(snapshot, slug, revision) {
  const seo = record(snapshot?.seo)
  return { schemaVersion: 1, slug, revision, blocks: Array.isArray(snapshot?.blocks) ? snapshot.blocks.map(publicBlock).filter(Boolean) : [], theme: publicTheme(snapshot?.theme), seo: { title: text(seo.title, 80), description: text(seo.description, 180), socialImageUrl: text(seo.socialImageUrl, 2048) || null } }
}

function decoded(value) { try { const result = decodeURIComponent(value); if (!result || result.includes('/') || result.includes('\\')) throw new Error(); return result } catch { throw new ApiError('not_found', 'Not found.', 404) } }
function assetPath(pathname) { const match = /^\/assets\/([^/]+)\/(\d+)\/([^/]+)$/.exec(pathname); return match ? { siteId: decoded(match[1]), revision: Number(match[2]), assetId: decoded(match[3]) } : null }
async function parseBody(request) { if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) throw new ApiError('unsupported_media_type', 'Use application/json for this request.', 415); const source = await request.text(); if (new TextEncoder().encode(source).byteLength > MAX_EVENT_BYTES) throw new ApiError('request_too_large', 'Event bodies must not exceed 64 KiB.', 413); try { return JSON.parse(source) } catch { throw new ApiError('invalid_argument', 'Request body must contain valid JSON.', 400) } }
function network(request) { return request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown' }

export function createPublicRoutes({ db, assets, staticAssets, analytics, origin }) {
  async function findSite(slug) { const row = await db.prepare('SELECT slug, snapshot_json, revision FROM published_sites WHERE slug = ?1 LIMIT 1').bind(slug).first(); return row ? publicSite(JSON.parse(row.snapshot_json), row.slug, row.revision) : null }
  async function staticFallback(request) { return staticAssets?.fetch ? staticAssets.fetch(request) : notFound() }
  function safeError(error) { const response = errorResponse(error); for (const [key, value] of Object.entries(headers('no-store'))) response.headers.set(key, value); return response }
  return { async handle(request) {
    try {
      const { pathname } = new URL(request.url); const asset = assetPath(pathname)
      if (asset) { const object = await assets.getPublic(asset); if (!object) return notFound(); const result = new Headers(headers(ASSET_CACHE)); object.writeHttpMetadata(result); result.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream'); return new Response(object.body, { headers: result }) }
      const jsonMatch = /^\/v1\/public\/sites\/([^/]+)$/.exec(pathname); const eventMatch = /^\/v1\/public\/sites\/([^/]+)\/events$/.exec(pathname)
      if (eventMatch) { if (request.method !== 'POST') return notFound(); return Response.json(await analytics.record({ slug: decoded(eventMatch[1]), data: await parseBody(request), network: network(request) }), { headers: headers('no-store') }) }
      if (jsonMatch) { if (request.method !== 'GET') return notFound(); const site = await findSite(decoded(jsonMatch[1])); return site ? Response.json({ site }, { headers: headers(PUBLIC_CACHE) }) : notFound() }
      if (pathname === '/' || pathname === '/index.html' || pathname.startsWith('/assets/')) return staticFallback(request)
      if (request.method !== 'GET') return notFound(); const slug = pathname.slice(1); if (!slug || slug.includes('/')) return notFound(); const site = await findSite(decoded(slug)); if (!site) return notFound(); const shell = await staticFallback(new Request(`${origin}/index.html`)); if (!shell.ok) return new Response('Public app shell is unavailable.', { status: 503, headers: headers('no-store') }); return new Response(renderPublicPage({ document: await shell.text(), site, origin }), { headers: { ...headers(PUBLIC_CACHE), 'Content-Type': 'text/html; charset=utf-8' } })
    } catch (error) { return safeError(error) }
  } }
}
