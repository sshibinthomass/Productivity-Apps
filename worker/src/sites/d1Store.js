function isoNow() {
  return new Date().toISOString()
}

function asDraft(row) {
  if (!row) return null
  const draft = JSON.parse(row.draft_json)
  return {
    ...draft,
    siteId: row.id,
    name: row.name,
    slug: row.slug,
    templateId: row.template_id,
    status: row.status,
    draftRevision: row.draft_revision,
    publishedRevision: row.published_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    analytics: {
      totalViews: Number(row.analytics_views ?? 0),
      totalClicks: Number(row.analytics_clicks ?? 0),
    },
  }
}

function draftJson(draft) {
  return JSON.stringify(draft)
}

function insertValues({ userId, draft }) {
  const timestamp = draft.updatedAt ?? draft.createdAt ?? isoNow()
  return [
    draft.siteId,
    userId,
    draft.name,
    draft.slug,
    draft.status === 'published' ? 'published' : 'draft',
    draft.templateId,
    draftJson(draft),
    Math.max(1, Number.isInteger(draft.draftRevision) ? draft.draftRevision : 1),
    Math.max(0, Number.isInteger(draft.publishedRevision) ? draft.publishedRevision : 0),
    draft.createdAt ?? timestamp,
    timestamp,
    draft.publishedAt ?? null,
  ]
}

function storeError(error) {
  const message = String(error?.message ?? error)
  if (message.includes('site_limit')) return { code: 'site-limit' }
  if (message.includes('UNIQUE constraint failed') || message.includes('UNIQUE constraint')) return { code: 'slug-taken' }
  throw error
}

function snapshotMetadata(snapshot) {
  return [
    draftJson(snapshot),
    String(snapshot.seo?.title ?? ''),
    String(snapshot.seo?.description ?? ''),
    typeof snapshot.seo?.socialImageUrl === 'string' ? snapshot.seo.socialImageUrl : null,
  ]
}

export function createD1Store({ db } = {}) {
  if (!db) throw new TypeError('A D1 database is required.')

  async function get({ userId, siteId }) {
    const row = await db.prepare(`
      SELECT *
      FROM mini_sites
      WHERE id = ?1 AND owner_id = ?2
      LIMIT 1
    `).bind(siteId, userId).first()
    return asDraft(row)
  }

  async function create({ userId, draft }) {
    try {
      await db.prepare(`
        INSERT INTO mini_sites (
          id, owner_id, name, slug, status, template_id, draft_json,
          draft_revision, published_revision, created_at, updated_at, published_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      `).bind(...insertValues({ userId, draft })).run()
      return get({ userId, siteId: draft.siteId })
    } catch (error) {
      return storeError(error)
    }
  }

  return {
    async list({ userId }) {
      const { results } = await db.prepare(`
        SELECT mini_sites.*, COALESCE(analytics_summary.view_count, 0) AS analytics_views,
          COALESCE(analytics_summary.click_count, 0) AS analytics_clicks
        FROM mini_sites LEFT JOIN analytics_summary ON analytics_summary.site_id = mini_sites.id
        WHERE owner_id = ?1
        ORDER BY updated_at DESC, id ASC
      `).bind(userId).all()
      return results.map(asDraft)
    },

    create,
    get,

    async saveDraft({ userId, siteId, draft, expectedRevision }) {
      const timestamp = draft.updatedAt ?? isoNow()
      const row = await db.prepare(`
        UPDATE mini_sites
        SET name = ?1,
            template_id = ?2,
            draft_json = ?3,
            draft_revision = draft_revision + 1,
            updated_at = ?4
        WHERE id = ?5
          AND owner_id = ?6
          AND draft_revision = ?7
        RETURNING *
      `).bind(draft.name, draft.templateId, draftJson(draft), timestamp, siteId, userId, expectedRevision).first()
      if (row) return asDraft(row)
      return (await get({ userId, siteId })) ? { code: 'revision-conflict' } : { code: 'not-found' }
    },

    async duplicate({ userId, sourceSiteId, draft }) {
      if (!(await get({ userId, siteId: sourceSiteId }))) return { code: 'not-found' }
      return create({ userId, draft })
    },

    async changeSlug({ userId, siteId, slug }) {
      const current = await get({ userId, siteId })
      if (!current) return { code: 'not-found' }
      try {
        await db.batch([
          db.prepare('UPDATE mini_sites SET slug = ?1, updated_at = ?2 WHERE id = ?3 AND owner_id = ?4').bind(slug, isoNow(), siteId, userId),
          db.prepare('UPDATE published_sites SET slug = ?1 WHERE site_id = ?2').bind(slug, siteId),
        ])
        return get({ userId, siteId })
      } catch (error) {
        return storeError(error)
      }
    },

    async publish({ userId, siteId, snapshot, expectedRevision, now = isoNow() }) {
      const current = await get({ userId, siteId })
      if (!current) return { code: 'not-found' }
      if (current.draftRevision !== expectedRevision) return { code: 'revision-conflict' }
      const [snapshotJson, title, description, socialImageUrl] = snapshotMetadata(snapshot)
      const results = await db.batch([
        db.prepare(`
          INSERT INTO published_sites (slug, site_id, snapshot_json, title, description, social_image_url, revision, published_at)
          SELECT slug, id, ?1, ?2, ?3, ?4, draft_revision, ?5
          FROM mini_sites
          WHERE id = ?6 AND owner_id = ?7 AND draft_revision = ?8
          ON CONFLICT(slug) DO UPDATE SET
            site_id = excluded.site_id,
            snapshot_json = excluded.snapshot_json,
            title = excluded.title,
            description = excluded.description,
            social_image_url = excluded.social_image_url,
            revision = excluded.revision,
            published_at = excluded.published_at
        `).bind(snapshotJson, title, description, socialImageUrl, now, siteId, userId, expectedRevision),
        db.prepare(`
          UPDATE mini_sites
          SET status = 'published', published_revision = draft_revision, published_at = ?1, updated_at = ?1
          WHERE id = ?2 AND owner_id = ?3 AND draft_revision = ?4
        `).bind(now, siteId, userId, expectedRevision),
      ])
      if (results[1].meta.changes !== 1) return { code: 'revision-conflict' }
      return { slug: current.slug, revision: expectedRevision }
    },

    async unpublish({ userId, siteId, now = isoNow() }) {
      if (!(await get({ userId, siteId }))) return { code: 'not-found' }
      await db.batch([
        db.prepare('DELETE FROM published_sites WHERE site_id = ?1').bind(siteId),
        db.prepare("UPDATE mini_sites SET status = 'draft', published_at = NULL, updated_at = ?1 WHERE id = ?2 AND owner_id = ?3").bind(now, siteId, userId),
      ])
      const site = await get({ userId, siteId })
      return { slug: site.slug }
    },

    async delete({ userId, siteId, confirmationName }) {
      const guard = 'EXISTS (SELECT 1 FROM mini_sites WHERE id = ?1 AND owner_id = ?2 AND name = ?3)'
      const statements = [
        db.prepare(`SELECT object_key FROM site_assets WHERE site_id = ?1 AND owner_id = ?2 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare(`DELETE FROM published_sites WHERE site_id = ?1 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare(`DELETE FROM site_assets WHERE site_id = ?1 AND owner_id = ?2 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare(`DELETE FROM analytics_summary WHERE site_id = ?1 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare(`DELETE FROM analytics_days WHERE site_id = ?1 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare(`DELETE FROM analytics_events WHERE site_id = ?1 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare(`DELETE FROM analytics_link_clicks WHERE site_id = ?1 AND ${guard}`).bind(siteId, userId, confirmationName),
        db.prepare('DELETE FROM mini_sites WHERE id = ?1 AND owner_id = ?2 AND name = ?3').bind(siteId, userId, confirmationName),
      ]
      const results = await db.batch(statements)
      if (results.at(-1).meta.changes !== 1) {
        const existing = await db.prepare('SELECT id FROM mini_sites WHERE id = ?1 AND owner_id = ?2').bind(siteId, userId).first()
        return existing ? { code: 'name-mismatch' } : { code: 'not-found' }
      }
      const result = { deleted: true }
      Object.defineProperty(result, 'assetKeys', { value: results[0].results.map(({ object_key: key }) => key) })
      return result
    },

    async getAnalytics({ userId, siteId }) {
      if (!(await get({ userId, siteId }))) return { code: 'not-found' }
      const [summaryRow, daysResult, linkResult] = await db.batch([
        db.prepare('SELECT view_count, click_count FROM analytics_summary WHERE site_id = ?1 LIMIT 1').bind(siteId),
        db.prepare('SELECT day, view_count, click_count FROM analytics_days WHERE site_id = ?1 ORDER BY day DESC LIMIT 30').bind(siteId),
        db.prepare('SELECT block_id, click_count FROM analytics_link_clicks WHERE site_id = ?1').bind(siteId),
      ])
      return {
        summary: {
          totalViews: summaryRow.results[0]?.view_count ?? 0,
          totalClicks: summaryRow.results[0]?.click_count ?? 0,
        },
        days: daysResult.results.reverse().map((row) => ({ date: row.day, views: row.view_count, clicks: row.click_count })),
        linkClicks: Object.fromEntries(linkResult.results.map((row) => [row.block_id, row.click_count])),
      }
    },
  }
}
