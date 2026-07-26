const accountPath = (uid) => `users/${uid}/private/account`
const sitePath = (uid, siteId) => `users/${uid}/sites/${siteId}`
const slugPath = (slug) => `miniSiteSlugs/${slug}`
const publishedPath = (slug) => `publishedMiniSites/${slug}`

function publicAssetUrl(bucket, path) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`
}

export function createAnalyticsUpdates(type, blockId, FieldValue) {
  if (type === 'view') {
    return {
      summary: { totalViews: FieldValue.increment(1) },
      day: { views: FieldValue.increment(1) },
    }
  }

  return {
    summary: {
      totalClicks: FieldValue.increment(1),
      linkClicks: { [blockId]: FieldValue.increment(1) },
    },
    day: {
      clicks: FieldValue.increment(1),
      linkClicks: { [blockId]: FieldValue.increment(1) },
    },
  }
}

export function createFirestoreStore({
  db,
  getBucket,
  FieldValue,
  Timestamp,
}) {
  return {
    async create({ uid, draft }) {
      return db.runTransaction(async (transaction) => {
        const accountRef = db.doc(accountPath(uid))
        const slugRef = db.doc(slugPath(draft.slug))
        const siteRef = db.doc(sitePath(uid, draft.siteId))
        const [accountSnapshot, slugSnapshot] = await Promise.all([
          transaction.get(accountRef),
          transaction.get(slugRef),
        ])
        const siteCount = accountSnapshot.data()?.siteCount ?? 0
        if (siteCount >= 5) return { code: 'site-limit' }
        if (slugSnapshot.exists) return { code: 'slug-taken' }

        transaction.set(accountRef, { siteCount: siteCount + 1 }, { merge: true })
        transaction.create(slugRef, {
          ownerId: uid,
          siteId: draft.siteId,
          createdAt: FieldValue.serverTimestamp(),
        })
        transaction.create(siteRef, {
          ...draft,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return draft
      })
    },

    async get({ uid, siteId }) {
      const snapshot = await db.doc(sitePath(uid, siteId)).get()
      return snapshot.exists
        ? { siteId: snapshot.id, ...snapshot.data() }
        : null
    },

    async duplicate({ uid, draft }) {
      return this.create({ uid, draft })
    },

    async changeSlug({ uid, siteId, slug }) {
      return db.runTransaction(async (transaction) => {
        const siteRef = db.doc(sitePath(uid, siteId))
        const nextSlugRef = db.doc(slugPath(slug))
        const [siteSnapshot, nextSlugSnapshot] = await Promise.all([
          transaction.get(siteRef),
          transaction.get(nextSlugRef),
        ])
        if (!siteSnapshot.exists) return { code: 'not-found' }
        if (nextSlugSnapshot.exists) return { code: 'slug-taken' }

        const site = siteSnapshot.data()
        const oldSlugRef = db.doc(slugPath(site.slug))
        const oldPublishedRef = db.doc(publishedPath(site.slug))
        const oldPublished = await transaction.get(oldPublishedRef)
        transaction.create(nextSlugRef, {
          ownerId: uid,
          siteId,
          createdAt: FieldValue.serverTimestamp(),
        })
        transaction.delete(oldSlugRef)
        transaction.update(siteRef, {
          slug,
          updatedAt: FieldValue.serverTimestamp(),
        })
        if (oldPublished.exists) {
          transaction.set(db.doc(publishedPath(slug)), {
            ...oldPublished.data(),
            slug,
          })
          transaction.delete(oldPublishedRef)
        }
        return { ...site, slug, siteId }
      })
    },

    async promoteAssets({ uid, siteId, draft }) {
      const bucket = getBucket()
      const revision = draft.draftRevision ?? 0
      const nextDraft = structuredClone(draft)
      const copies = []
      const allowedPrefix = `mini-site-drafts/${uid}/${siteId}/`

      for (const block of nextDraft.blocks ?? []) {
        const storagePath =
          block.type === 'image'
            ? block.content?.storagePath
            : block.type === 'profile'
              ? block.content?.avatarStoragePath
              : null
        if (!storagePath?.startsWith('mini-site-drafts/')) continue
        if (!storagePath.startsWith(allowedPrefix)) {
          const error = new Error(
            'Draft assets must belong to this mini-site.',
          )
          error.code = 'invalid-argument'
          throw error
        }
        const filename = storagePath.split('/').at(-1)
        const publicPath = `mini-site-public/${siteId}/${revision}/${filename}`
        copies.push(bucket.file(storagePath).copy(bucket.file(publicPath)))
        if (block.type === 'image') {
          block.content.url = publicAssetUrl(bucket, publicPath)
        } else {
          block.content.avatarUrl = publicAssetUrl(bucket, publicPath)
        }
      }
      await Promise.all(copies)
      return nextDraft
    },

    async publish({ uid, siteId, snapshot, expectedRevision }) {
      return db.runTransaction(async (transaction) => {
        const siteRef = db.doc(sitePath(uid, siteId))
        const siteSnapshot = await transaction.get(siteRef)
        if (!siteSnapshot.exists) return { code: 'not-found' }
        const site = siteSnapshot.data()
        if ((site.draftRevision ?? 0) !== expectedRevision) {
          return { code: 'revision-conflict' }
        }
        transaction.set(db.doc(publishedPath(site.slug)), {
          ...snapshot,
          slug: site.slug,
          publishedAt: FieldValue.serverTimestamp(),
        })
        transaction.update(siteRef, {
          status: 'published',
          publishedRevision: site.draftRevision ?? 0,
          publishedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return { slug: site.slug, revision: site.draftRevision ?? 0 }
      })
    },

    async unpublish({ uid, siteId }) {
      return db.runTransaction(async (transaction) => {
        const siteRef = db.doc(sitePath(uid, siteId))
        const siteSnapshot = await transaction.get(siteRef)
        if (!siteSnapshot.exists) return { code: 'not-found' }
        const site = siteSnapshot.data()
        transaction.delete(db.doc(publishedPath(site.slug)))
        transaction.update(siteRef, {
          status: 'draft',
          updatedAt: FieldValue.serverTimestamp(),
        })
        return { slug: site.slug }
      })
    },

    async delete({ uid, siteId, confirmationName }) {
      const result = await db.runTransaction(async (transaction) => {
        const siteRef = db.doc(sitePath(uid, siteId))
        const accountRef = db.doc(accountPath(uid))
        const [siteSnapshot, accountSnapshot] = await Promise.all([
          transaction.get(siteRef),
          transaction.get(accountRef),
        ])
        if (!siteSnapshot.exists) return { code: 'not-found' }
        const site = siteSnapshot.data()
        if (site.name !== confirmationName) return { code: 'name-mismatch' }
        transaction.delete(siteRef)
        transaction.delete(db.doc(slugPath(site.slug)))
        transaction.delete(db.doc(publishedPath(site.slug)))
        transaction.set(
          accountRef,
          { siteCount: Math.max(0, (accountSnapshot.data()?.siteCount ?? 1) - 1) },
          { merge: true },
        )
        return { deleted: true, siteRef }
      })
      if (result.deleted) {
        const bucket = getBucket()
        await Promise.all([
          db.recursiveDelete(result.siteRef),
          bucket.deleteFiles({ prefix: `mini-site-drafts/${uid}/${siteId}/` }),
          bucket.deleteFiles({ prefix: `mini-site-public/${siteId}/` }),
        ])
        return { deleted: true }
      }
      return result
    },

    async recordEvent({ slug, type, blockId, receiptId, now }) {
      return db.runTransaction(async (transaction) => {
        const publishedRef = db.doc(publishedPath(slug))
        const receiptRef = db.doc(`miniSiteEventReceipts/${receiptId}`)
        const [publishedSnapshot, receiptSnapshot] = await Promise.all([
          transaction.get(publishedRef),
          transaction.get(receiptRef),
        ])
        if (!publishedSnapshot.exists) return { code: 'not-found' }
        if (receiptSnapshot.exists) return { duplicate: true }
        const published = publishedSnapshot.data()
        if (
          type === 'link_click' &&
          !published.blocks?.some(
            (block) =>
              block.id === blockId &&
              ['link', 'socials'].includes(block.type) &&
              block.visible !== false,
          )
        ) {
          return { code: 'unknown-link' }
        }

        const slugRecord = await transaction.get(db.doc(slugPath(slug)))
        if (!slugRecord.exists) return { code: 'not-found' }
        const { ownerId, siteId } = slugRecord.data()
        const summaryRef = db.doc(
          `users/${ownerId}/sites/${siteId}/analytics/summary`,
        )
        const day = String(now).slice(0, 10)
        const dayRef = db.doc(
          `users/${ownerId}/sites/${siteId}/analyticsDays/${day}`,
        )
        const updates = createAnalyticsUpdates(type, blockId, FieldValue)
        transaction.create(receiptRef, {
          expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        })
        transaction.set(summaryRef, updates.summary, { merge: true })
        transaction.set(dayRef, { date: day, ...updates.day }, { merge: true })
        return { recorded: true }
      })
    },
  }
}
