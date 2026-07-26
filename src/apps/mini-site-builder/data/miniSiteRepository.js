import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { firebaseClient } from '../../../auth/firebaseClient.js'
import { normalizeDraft } from '../model/miniSiteModel.js'

const firebaseSdk = {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  httpsCallable,
  ref,
  uploadBytes,
  getDownloadURL,
}

function requireService(value, name) {
  if (!value) {
    const error = new Error(`Firebase ${name} is not configured.`)
    error.code = 'configuration-error'
    throw error
  }
  return value
}

function documentData(snapshot, fallback = null) {
  return snapshot.exists() ? snapshot.data() : fallback
}

function callable(client, sdk, name) {
  return async (payload) => {
    const operation = sdk.httpsCallable(
      requireService(client.functions, 'Functions'),
      name,
    )
    return (await operation(payload)).data
  }
}

export function createMiniSiteRepository(client, sdk = firebaseSdk) {
  const getDatabase = () => requireService(client.db, 'Firestore')
  const lifecycle = Object.fromEntries(
    [
      'createMiniSite',
      'duplicateMiniSite',
      'changeMiniSiteSlug',
      'publishMiniSite',
      'unpublishMiniSite',
      'deleteMiniSite',
      'recordMiniSiteEvent',
    ].map((name) => [name, callable(client, sdk, name)]),
  )

  return {
    async listSites(uid) {
      const db = getDatabase()
      const sitesQuery = sdk.query(
        sdk.collection(db, 'users', uid, 'sites'),
        sdk.orderBy('updatedAt', 'desc'),
      )
      const snapshot = await sdk.getDocs(sitesQuery)
      return snapshot.docs.map((item) => ({
        id: item.id,
        ...normalizeDraft(item.data()),
      }))
    },

    async getDraft(uid, siteId) {
      const db = getDatabase()
      const snapshot = await sdk.getDoc(
        sdk.doc(db, 'users', uid, 'sites', siteId),
      )
      if (!snapshot.exists()) {
        const error = new Error('This mini-site could not be found.')
        error.code = 'not-found'
        throw error
      }
      return { id: siteId, ...normalizeDraft(snapshot.data()) }
    },

    async saveDraft(uid, siteId, draft, expectedRevision) {
      const db = getDatabase()
      const siteRef = sdk.doc(db, 'users', uid, 'sites', siteId)
      return sdk.runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(siteRef)
        if (!snapshot.exists()) {
          const error = new Error('This mini-site could not be found.')
          error.code = 'not-found'
          throw error
        }
        const currentRevision = snapshot.data().draftRevision ?? 0
        if (currentRevision !== expectedRevision) {
          const error = new Error(
            'This mini-site changed in another session. Reload before saving.',
          )
          error.code = 'revision-conflict'
          throw error
        }
        const normalized = normalizeDraft(draft)
        const nextRevision = currentRevision + 1
        transaction.update(siteRef, {
          name: normalized.name,
          templateId: normalized.templateId,
          blocks: normalized.blocks,
          theme: normalized.theme,
          seo: normalized.seo,
          draftRevision: nextRevision,
          updatedAt: sdk.serverTimestamp?.() ?? new Date().toISOString(),
        })
        return { ...normalized, id: siteId, draftRevision: nextRevision }
      })
    },

    async getPublished(slug) {
      const db = getDatabase()
      const snapshot = await sdk.getDoc(
        sdk.doc(db, 'publishedMiniSites', slug),
      )
      return documentData(snapshot)
    },

    createSite: lifecycle.createMiniSite,
    duplicateSite: lifecycle.duplicateMiniSite,
    changeSlug: lifecycle.changeMiniSiteSlug,
    publishSite: (siteId) => lifecycle.publishMiniSite({ siteId }),
    unpublishSite: (siteId) => lifecycle.unpublishMiniSite({ siteId }),
    deleteSite: lifecycle.deleteMiniSite,
    recordEvent: lifecycle.recordMiniSiteEvent,

    async uploadDraftAsset({ uid, siteId, assetId, file }) {
      const storage = requireService(client.storage, 'Storage')
      const storagePath = `mini-site-drafts/${uid}/${siteId}/${assetId}`
      const assetRef = sdk.ref(storage, storagePath)
      const uploaded = await sdk.uploadBytes(assetRef, file, {
        contentType: file.type,
      })
      return {
        storagePath,
        url: await sdk.getDownloadURL(uploaded.ref),
      }
    },

    async getAnalytics(uid, siteId) {
      const db = getDatabase()
      const summarySnapshot = await sdk.getDoc(
        sdk.doc(
          db,
          'users',
          uid,
          'sites',
          siteId,
          'analytics',
          'summary',
        ),
      )
      const daysSnapshot = await sdk.getDocs(
        sdk.query(
          sdk.collection(
            db,
            'users',
            uid,
            'sites',
            siteId,
            'analyticsDays',
          ),
          sdk.orderBy('date', 'desc'),
          sdk.limit(30),
        ),
      )
      const summary = documentData(summarySnapshot, {
        totalViews: 0,
        totalClicks: 0,
        linkClicks: {},
      })
      return {
        summary,
        days: daysSnapshot.docs
          .map((item) => ({ date: item.id, ...item.data() }))
          .reverse(),
        linkClicks: summary.linkClicks ?? {},
      }
    },
  }
}

export const miniSiteRepository = createMiniSiteRepository(firebaseClient)
