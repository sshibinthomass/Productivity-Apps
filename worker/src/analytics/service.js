import { ApiError } from '../http/errors.js'
import { parseEventInput } from '../sites/domain.js'

const RETENTION_DAYS = 90

function asDate(value) {
  return value instanceof Date ? value : new Date(value)
}

function validUrl(value) {
  try { return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(String(value)).protocol) } catch { return false }
}

function isClickTarget(snapshot, blockId) {
  const block = snapshot?.blocks?.find((candidate) => candidate?.id === blockId && candidate.visible !== false)
  if (!block) return false
  if (block.type === 'link') return typeof block.content?.label === 'string' && block.content.label.trim() && validUrl(block.content.url)
  return block.type === 'socials' && Array.isArray(block.content?.links) && block.content.links.some((link) => validUrl(link?.url))
}

async function receiptId(input) {
  const source = `${input.slug}:${input.eventId}:${input.type}:${input.blockId ?? ''}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function eventName(type) {
  return type === 'view' ? 'view' : 'click'
}

export function createAnalyticsService({ db, now = () => new Date() } = {}) {
  if (!db) throw new TypeError('A D1 database is required.')

  return {
    async record({ slug, data }) {
      const input = parseEventInput({ ...data, slug })
      const published = await db.prepare('SELECT site_id, snapshot_json FROM published_sites WHERE slug = ?1 LIMIT 1').bind(input.slug).first()
      if (!published) throw new ApiError('not_found', 'Not found.', 404)
      const snapshot = JSON.parse(published.snapshot_json)
      if (input.type === 'link_click' && !isClickTarget(snapshot, input.blockId)) {
        throw new ApiError('invalid_argument', 'That link is not part of the published site.', 400)
      }
      const occurred = asDate(now())
      const expires = new Date(occurred.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000)
      const day = occurred.toISOString().slice(0, 10)
      const kind = eventName(input.type)
      const id = await receiptId(input)
      const statements = [
        db.prepare(`INSERT OR IGNORE INTO analytics_events (receipt_id, site_id, event_type, block_id, occurred_at, expires_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)`).bind(id, published.site_id, kind, input.blockId ?? null, occurred.toISOString(), expires.toISOString()),
        db.prepare(`INSERT INTO analytics_summary (site_id, view_count, click_count, updated_at)
          SELECT ?1, ?2, ?3, ?4 WHERE changes() = 1
          ON CONFLICT(site_id) DO UPDATE SET view_count = view_count + excluded.view_count,
            click_count = click_count + excluded.click_count, updated_at = excluded.updated_at`)
          .bind(published.site_id, kind === 'view' ? 1 : 0, kind === 'click' ? 1 : 0, occurred.toISOString()),
        db.prepare(`INSERT INTO analytics_days (site_id, day, view_count, click_count)
          SELECT ?1, ?2, ?3, ?4 WHERE changes() = 1
          ON CONFLICT(site_id, day) DO UPDATE SET view_count = view_count + excluded.view_count,
            click_count = click_count + excluded.click_count`)
          .bind(published.site_id, day, kind === 'view' ? 1 : 0, kind === 'click' ? 1 : 0),
      ]
      const results = await db.batch(statements)
      const recorded = results[0].meta.changes === 1
      return { recorded, duplicate: !recorded }
    },

    async cleanup({ assets } = {}) {
      const before = asDate(now()).toISOString()
      await db.batch([
        db.prepare('DELETE FROM analytics_events WHERE expires_at < ?1').bind(before),
        db.prepare('DELETE FROM auth_rate_limits WHERE expires_at < ?1').bind(before),
      ])
      await assets?.cleanupObsoletePublicAssets?.({ now: asDate(now()) })
    },
  }
}
