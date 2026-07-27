import { ApiError } from '../http/errors.js'
import { parseEventInput } from '../sites/domain.js'

const RETENTION_DAYS = 90
const EVENT_LIMIT = 30
const EVENT_WINDOW_SECONDS = 60

function asDate(value) { return value instanceof Date ? value : new Date(value) }
function validUrl(value) { try { return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(String(value)).protocol) } catch { return false } }
function eventName(type) { return type === 'view' ? 'view' : 'click' }

function isClickTarget(snapshot, blockId) {
  const block = snapshot?.blocks?.find((candidate) => candidate?.id === blockId && candidate.visible !== false)
  if (!block) return false
  if (block.type === 'link') return typeof block.content?.label === 'string' && block.content.label.trim() && validUrl(block.content.url)
  return block.type === 'socials' && Array.isArray(block.content?.links) && block.content.links.some((link) => validUrl(link?.url))
}

async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmac(value, key) {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function receiptId({ siteId, revision, type, eventId, blockId }) {
  return hash(JSON.stringify([siteId, revision, type, eventId, blockId ?? null]))
}

async function enforceEventRateLimit({ db, siteId, network, now, rateLimitKey }) {
  const timestamp = asDate(now)
  const windowMs = EVENT_WINDOW_SECONDS * 1000
  const startedAt = new Date(Math.floor(timestamp.getTime() / windowMs) * windowMs).toISOString()
  const expiresAt = new Date(new Date(startedAt).getTime() + windowMs).toISOString()
  const key = await hmac(JSON.stringify([siteId, String(network || 'unknown')]), rateLimitKey)
  const row = await db.prepare(`INSERT INTO public_event_rate_limits (key_hash, window_started_at, attempt_count, expires_at)
    VALUES (?1, ?2, 1, ?3)
    ON CONFLICT(key_hash) DO UPDATE SET window_started_at = excluded.window_started_at,
      attempt_count = CASE WHEN public_event_rate_limits.window_started_at = excluded.window_started_at THEN public_event_rate_limits.attempt_count + 1 ELSE 1 END,
      expires_at = excluded.expires_at
    RETURNING attempt_count`).bind(key, startedAt, expiresAt).first()
  if (row.attempt_count > EVENT_LIMIT) throw new ApiError('rate_limited', 'Too many events. Try again shortly.', 429)
}

export function createAnalyticsService({ db, now = () => new Date(), beforePersist, rateLimitKey } = {}) {
  if (!db) throw new TypeError('A D1 database is required.')
  if (typeof rateLimitKey !== 'string' || !rateLimitKey) throw new TypeError('A public event rate-limit key is required.')
  return {
    async record({ slug, data, network }) {
      const input = parseEventInput({ ...data, slug })
      if (input.type === 'view' && input.blockId) throw new ApiError('invalid_argument', 'Views must not include a block ID.', 400)
      const published = await db.prepare('SELECT site_id, snapshot_json, revision FROM published_sites WHERE slug = ?1 LIMIT 1').bind(input.slug).first()
      if (!published) throw new ApiError('not_found', 'Not found.', 404)
      if (input.type === 'link_click' && !isClickTarget(JSON.parse(published.snapshot_json), input.blockId)) throw new ApiError('invalid_argument', 'That link is not part of the published site.', 400)
      const occurred = asDate(now())
      await enforceEventRateLimit({ db, siteId: published.site_id, network, now: occurred, rateLimitKey })
      await beforePersist?.({ siteId: published.site_id, revision: published.revision })
      const expires = new Date(occurred.getTime() + RETENTION_DAYS * 86400000)
      const kind = eventName(input.type)
      const id = await receiptId({ siteId: published.site_id, revision: published.revision, ...input })
      const statements = [
        db.prepare(`INSERT OR IGNORE INTO analytics_events (receipt_id, site_id, event_type, block_id, occurred_at, expires_at)
          SELECT ?1, site_id, ?2, ?3, ?4, ?5 FROM published_sites
          WHERE slug = ?6 AND site_id = ?7 AND revision = ?8`).bind(id, kind, input.blockId ?? null, occurred.toISOString(), expires.toISOString(), input.slug, published.site_id, published.revision),
      ]
      if (kind === 'click') {
        statements.push(db.prepare(`INSERT INTO analytics_link_clicks (site_id, block_id, click_count)
          SELECT ?1, ?2, 1 WHERE changes() = 1
          ON CONFLICT(site_id, block_id) DO UPDATE SET click_count = click_count + excluded.click_count`)
          .bind(published.site_id, input.blockId))
      }
      statements.push(
        db.prepare(`INSERT INTO analytics_summary (site_id, view_count, click_count, updated_at)
          SELECT ?1, ?2, ?3, ?4 WHERE changes() = 1
          ON CONFLICT(site_id) DO UPDATE SET view_count = view_count + excluded.view_count, click_count = click_count + excluded.click_count, updated_at = excluded.updated_at`)
          .bind(published.site_id, kind === 'view' ? 1 : 0, kind === 'click' ? 1 : 0, occurred.toISOString()),
        db.prepare(`INSERT INTO analytics_days (site_id, day, view_count, click_count)
          SELECT ?1, ?2, ?3, ?4 WHERE changes() = 1
          ON CONFLICT(site_id, day) DO UPDATE SET view_count = view_count + excluded.view_count, click_count = click_count + excluded.click_count`)
          .bind(published.site_id, occurred.toISOString().slice(0, 10), kind === 'view' ? 1 : 0, kind === 'click' ? 1 : 0),
      )
      const inserted = await db.batch(statements)
      if (inserted[0].meta.changes === 1) return { recorded: true, duplicate: false }
      const existing = await db.prepare('SELECT receipt_id FROM analytics_events WHERE receipt_id = ?1').bind(id).first()
      return { recorded: false, duplicate: Boolean(existing) }
    },
    async cleanup({ assets } = {}) {
      const before = asDate(now()).toISOString()
      await db.batch([
        db.prepare('DELETE FROM analytics_events WHERE expires_at < ?1').bind(before),
        db.prepare('DELETE FROM auth_rate_limits WHERE expires_at < ?1').bind(before),
        db.prepare('DELETE FROM public_event_rate_limits WHERE expires_at < ?1').bind(before),
      ])
      await assets?.cleanupObsoletePublicAssets?.({ now: asDate(now()) })
    },
  }
}
