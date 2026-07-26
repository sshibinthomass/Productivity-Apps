import { createExecutionContext, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorker } from '../src/index.js'
import { resetDatabase } from './support/database.js'

const publicOrigin = 'https://links.shibinthomas.com'

function snapshot({ slug, title = 'Maya', description = 'A creative studio', blocks = [] } = {}) {
  return {
    schemaVersion: 1,
    siteId: 'private-site-id',
    slug,
    revision: 3,
    blocks,
    theme: { colors: { text: '#111111' } },
    seo: { title, description, socialImageUrl: null, privatePath: 'drafts/private' },
  }
}

async function seedPublishedSite(db, { slug = 'maya-links', title, description, blocks } = {}) {
  const data = snapshot({ slug, title, description, blocks })
  await db.prepare(`INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, social_image_url, revision, published_at)
    VALUES (?1, ?2, ?3, ?4, ?5, NULL, 3, '2026-07-26T00:00:00.000Z')`)
    .bind(slug, 'private-site-id', JSON.stringify(data), data.seo.title, data.seo.description).run()
  return data
}

describe('public mini-site routes', () => {
  let worker

  beforeEach(async () => {
    await resetDatabase(env.DB, env.TEST_MIGRATIONS)
    worker = createWorker()
  })

  it('serves published content with escaped metadata and bootstrap JSON', async () => {
    await seedPublishedSite(env.DB, {
      title: 'Maya & Studio',
      description: 'Work <script>alert(1)</script>',
    })

    const response = await worker.fetch(new Request(`${publicOrigin}/maya-links`), env, createExecutionContext())
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('<title>Maya &amp; Studio</title>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('id="mini-site-bootstrap"')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, stale-while-revalidate=300')
  })

  it('does not serve missing or unpublished slugs and prevents private snapshot fields leaking in public JSON', async () => {
    await seedPublishedSite(env.DB, { blocks: [{
      id: 'profile', type: 'profile', visible: true,
      content: { displayName: 'Maya', avatarUrl: 'https://links.shibinthomas.com/assets/private-site-id/3/avatar', avatarStoragePath: 'drafts/private-site-id/avatar', bio: 'Hello' },
    }] })
    const published = await worker.fetch(new Request(`${publicOrigin}/v1/public/sites/maya-links`), env, createExecutionContext())
    const missing = await worker.fetch(new Request(`${publicOrigin}/not-published`), env, createExecutionContext())

    expect(published.status).toBe(200)
    const { site } = await published.json()
    expect(site).toMatchObject({ slug: 'maya-links', revision: 3 })
    expect(site).not.toHaveProperty('siteId')
    expect(site.seo).not.toHaveProperty('privatePath')
    expect(site.blocks[0].content).toMatchObject({ displayName: 'Maya', bio: 'Hello' })
    expect(site.blocks[0].content).not.toHaveProperty('avatarStoragePath')
    expect(missing.status).toBe(404)
    expect(missing.headers.get('Cache-Control')).toBe('no-store')
  })

  it('uses static asset fallback outside public R2 asset paths', async () => {
    const response = await worker.fetch(new Request(`${publicOrigin}/assets/not-a-public-r2-object.js`), env, createExecutionContext())

    expect(response.status).not.toBe(500)
  })

  it('streams published R2 assets with their authoritative MIME type and nosniff', async () => {
    await env.MEDIA.put('public/private-site-id/3/avatar', new Uint8Array([137, 80, 78, 71]), {
      httpMetadata: { contentType: 'image/png', contentDisposition: 'inline; filename="avatar"' },
    })

    const response = await worker.fetch(new Request(`${publicOrigin}/assets/private-site-id/3/avatar`), env, createExecutionContext())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })
})
