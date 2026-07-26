import {
  createInitialDraft,
  parseCreateInput,
  parseDraftForSave,
  parseEventInput,
  parseSiteId,
  parseSlug,
  requireUserId,
  sanitizeSnapshot,
  siteError,
  validatePublishableDraft,
} from './domain.js'

function throwStoreError(result) {
  const errors = {
    'site-limit': ['site_limit', 'Each account can manage up to five mini-sites.', 409],
    'slug-taken': ['slug_taken', 'That public slug is already in use.', 409],
    'not-found': ['not_found', 'This mini-site could not be found.', 404],
    'name-mismatch': ['name_mismatch', 'Type the exact site name to delete it.', 412],
    'unknown-link': ['invalid_argument', 'That link is not part of the published site.', 400],
    'revision-conflict': ['revision_conflict', 'The draft changed while publishing. Try publishing again.', 409],
  }
  if (result?.code && errors[result.code]) throw siteError(...errors[result.code])
  return result
}

async function eventReceiptId(input) {
  const bytes = new TextEncoder().encode(`${input.slug}:${input.eventId}:${input.type}:${input.blockId ?? ''}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createMiniSiteService({ store, assets, createId = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  if (!store) throw new TypeError('A mini-site store is required.')
  const promotionService = assets ?? store
  return {
    async createMiniSite({ userId, data }) {
      userId = requireUserId(userId); const input = parseCreateInput(data)
      const draft = createInitialDraft({ ...input, siteId: createId(), now: now() })
      return throwStoreError(await store.create({ userId, draft }))
    },
    async duplicateMiniSite({ userId, data }) {
      userId = requireUserId(userId); const sourceSiteId = parseSiteId(data?.sourceSiteId); const input = parseCreateInput(data)
      const source = await store.get({ userId, siteId: sourceSiteId }); if (!source) throwStoreError({ code: 'not-found' })
      const timestamp = now(); const draft = { ...structuredClone(source), siteId: createId(), name: input.name, slug: input.slug, templateId: source.templateId, status: 'draft', draftRevision: 0, publishedRevision: 0, createdAt: timestamp, updatedAt: timestamp, publishedAt: null }
      return throwStoreError(await store.duplicate({ userId, sourceSiteId, draft }))
    },
    async saveMiniSiteDraft({ userId, data }) {
      userId = requireUserId(userId); const siteId = parseSiteId(data?.siteId); const expectedRevision = data?.expectedRevision
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw siteError('invalid-argument', 'Choose a valid draft revision.')
      return throwStoreError(await store.saveDraft({ userId, siteId, draft: parseDraftForSave(data?.draft), expectedRevision }))
    },
    async changeMiniSiteSlug({ userId, data }) {
      userId = requireUserId(userId); return throwStoreError(await store.changeSlug({ userId, siteId: parseSiteId(data?.siteId), slug: parseSlug(data?.slug) }))
    },
    async publishMiniSite({ userId, data }) {
      userId = requireUserId(userId); const siteId = parseSiteId(data?.siteId); const draft = await store.get({ userId, siteId }); if (!draft) throwStoreError({ code: 'not-found' }); validatePublishableDraft(draft)
      const promotion = promotionService.promoteReferenced ? await promotionService.promoteReferenced({ userId, siteId, draft, attemptId: createId() }) : promotionService.promoteAssets ? await promotionService.promoteAssets({ userId, siteId, draft, attemptId: createId() }) : { draft, publicPaths: [] }
      const cleanupPromotion = async () => {
        if (promotion.publicPaths.length > 0) {
          const cleanup = promotionService.cleanupObsolete ?? promotionService.cleanupPromotedAssets
          if (cleanup) await cleanup.call(promotionService, { publicPaths: promotion.publicPaths })
        }
      }
      try {
        const publication = throwStoreError(await store.publish({ userId, siteId, snapshot: sanitizeSnapshot(promotion.draft), expectedRevision: draft.draftRevision ?? 0, now: now() }))
        await cleanupPromotion().catch(() => {})
        return publication
      } catch (error) {
        await cleanupPromotion().catch(() => {})
        throw error
      }
    },
    async unpublishMiniSite({ userId, data }) { userId = requireUserId(userId); return throwStoreError(await store.unpublish({ userId, siteId: parseSiteId(data?.siteId), now: now() })) },
    async deleteMiniSite({ userId, data }) {
      userId = requireUserId(userId); const siteId = parseSiteId(data?.siteId); const confirmationName = typeof data?.confirmationName === 'string' ? data.confirmationName : ''
      const current = await store.get({ userId, siteId })
      if (!current) throwStoreError({ code: 'not-found' })
      if (current.name !== confirmationName) throwStoreError({ code: 'name-mismatch' })
      const deletion = throwStoreError(await store.delete({ userId, siteId, confirmationName }))
      if (deletion.deleted && promotionService.deleteSiteAssets) {
        await promotionService.deleteSiteAssets({ siteId, assetKeys: deletion.assetKeys ?? [] }).catch(() => {})
      }
      return { deleted: true }
    },
    async recordMiniSiteEvent({ data }) { const input = parseEventInput(data); return throwStoreError(await store.recordEvent({ ...input, receiptId: await eventReceiptId(input), now: now() })) },
  }
}
