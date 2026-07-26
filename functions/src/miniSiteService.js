import { createHash, randomUUID } from 'node:crypto'
import {
  assertAuthenticated,
  createInitialDraft,
  functionError,
  parseCreateInput,
  parseDraftForSave,
  parseEventInput,
  parseSiteId,
  parseSlug,
  sanitizeSnapshot,
  validatePublishableDraft,
} from './domain.js'

function throwStoreError(result) {
  const errors = {
    'site-limit': [
      'resource-exhausted',
      'Each account can manage up to five mini-sites.',
    ],
    'slug-taken': [
      'already-exists',
      'That public slug is already in use.',
    ],
    'not-found': ['not-found', 'This mini-site could not be found.'],
    'name-mismatch': [
      'failed-precondition',
      'Type the exact site name to delete it.',
    ],
    'unknown-link': [
      'invalid-argument',
      'That link is not part of the published site.',
    ],
    'revision-conflict': [
      'aborted',
      'The draft changed while publishing. Try publishing again.',
    ],
  }
  if (result?.code && errors[result.code]) {
    throw functionError(...errors[result.code])
  }
  return result
}

export function createMiniSiteService({
  store,
  createId = randomUUID,
  now = () => new Date().toISOString(),
} = {}) {
  if (!store) throw new TypeError('A mini-site store is required.')

  return {
    async createMiniSite(request) {
      const uid = assertAuthenticated(request.auth)
      const input = parseCreateInput(request.data)
      const draft = createInitialDraft({
        ...input,
        siteId: createId(),
        now: now(),
      })
      return throwStoreError(await store.create({ uid, draft }))
    },

    async duplicateMiniSite(request) {
      const uid = assertAuthenticated(request.auth)
      const sourceSiteId = parseSiteId(request.data?.sourceSiteId)
      const input = parseCreateInput(request.data)
      const source = await store.get({ uid, siteId: sourceSiteId })
      if (!source) throwStoreError({ code: 'not-found' })
      const timestamp = now()
      const draft = {
        ...structuredClone(source),
        siteId: createId(),
        name: input.name,
        slug: input.slug,
        templateId: source.templateId,
        status: 'draft',
        draftRevision: 0,
        publishedRevision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        publishedAt: null,
      }
      return throwStoreError(
        await store.duplicate({ uid, sourceSiteId, draft }),
      )
    },

    async saveMiniSiteDraft(request) {
      const uid = assertAuthenticated(request.auth)
      const siteId = parseSiteId(request.data?.siteId)
      const expectedRevision = request.data?.expectedRevision
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw functionError(
          'invalid-argument',
          'Choose a valid draft revision.',
        )
      }
      const draft = parseDraftForSave(request.data?.draft)
      return throwStoreError(
        await store.saveDraft({
          uid,
          siteId,
          draft,
          expectedRevision,
        }),
      )
    },

    async changeMiniSiteSlug(request) {
      const uid = assertAuthenticated(request.auth)
      const siteId = parseSiteId(request.data?.siteId)
      const slug = parseSlug(request.data?.slug)
      return throwStoreError(await store.changeSlug({ uid, siteId, slug }))
    },

    async publishMiniSite(request) {
      const uid = assertAuthenticated(request.auth)
      const siteId = parseSiteId(request.data?.siteId)
      const draft = await store.get({ uid, siteId })
      if (!draft) throwStoreError({ code: 'not-found' })
      validatePublishableDraft(draft)
      const promotion = store.promoteAssets
        ? await store.promoteAssets({ uid, siteId, draft })
        : { draft, publicPaths: [] }
      try {
        return throwStoreError(
          await store.publish({
            uid,
            siteId,
            snapshot: sanitizeSnapshot(promotion.draft),
            expectedRevision: draft.draftRevision ?? 0,
            now: now(),
          }),
        )
      } catch (error) {
        if (
          promotion.publicPaths.length > 0 &&
          store.cleanupPromotedAssets
        ) {
          await store
            .cleanupPromotedAssets({
              publicPaths: promotion.publicPaths,
            })
            .catch(() => undefined)
        }
        throw error
      }
    },

    async unpublishMiniSite(request) {
      const uid = assertAuthenticated(request.auth)
      const siteId = parseSiteId(request.data?.siteId)
      return throwStoreError(await store.unpublish({ uid, siteId, now: now() }))
    },

    async deleteMiniSite(request) {
      const uid = assertAuthenticated(request.auth)
      const siteId = parseSiteId(request.data?.siteId)
      const confirmationName =
        typeof request.data?.confirmationName === 'string'
          ? request.data.confirmationName
          : ''
      return throwStoreError(
        await store.delete({ uid, siteId, confirmationName }),
      )
    },

    async recordMiniSiteEvent(request) {
      const input = parseEventInput(request.data)
      const receiptId = createHash('sha256')
        .update(
          `${input.slug}:${input.eventId}:${input.type}:${input.blockId ?? ''}`,
        )
        .digest('hex')
      return throwStoreError(
        await store.recordEvent({ ...input, receiptId, now: now() }),
      )
    },
  }
}
