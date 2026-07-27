import { applyD1Migrations } from 'cloudflare:test'

const tables = [
  'analytics_events',
  'analytics_link_clicks',
  'analytics_days',
  'analytics_summary',
  'public_event_rate_limits',
  'maintenance_cursors',
  'site_assets',
  'published_sites',
  'mini_sites',
  'auth_rate_limits',
  'user_consents',
  'session',
  'account',
  'verification',
  'user',
]

export async function resetDatabase(db, migrations) {
  await applyD1Migrations(db, migrations)
  for (const table of tables) {
    await db.prepare(`DELETE FROM "${table}"`).run()
  }
}
