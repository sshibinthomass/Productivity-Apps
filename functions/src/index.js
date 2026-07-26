import { initializeApp } from 'firebase-admin/app'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { createCallableOptions } from './callableOptions.js'
import { createFirestoreStore } from './firestoreStore.js'
import { createMiniSiteService } from './miniSiteService.js'

initializeApp()

const store = createFirestoreStore({
  db: getFirestore(),
  getBucket: () => getStorage().bucket(),
  FieldValue,
  Timestamp,
})
const service = createMiniSiteService({ store })
const callableOptions = createCallableOptions()

function asCallable(operation) {
  return onCall(callableOptions, async (request) => {
    try {
      return await operation({
        auth: request.auth,
        app: request.app,
        data: request.data,
      })
    } catch (error) {
      console.error('Mini-site callable failed', {
        code: error?.code,
        message: error?.message,
      })
      throw new HttpsError(
        error.code ?? 'internal',
        error.message ?? 'The mini-site operation failed.',
      )
    }
  })
}

export const createMiniSite = asCallable(service.createMiniSite)
export const duplicateMiniSite = asCallable(service.duplicateMiniSite)
export const changeMiniSiteSlug = asCallable(service.changeMiniSiteSlug)
export const publishMiniSite = asCallable(service.publishMiniSite)
export const unpublishMiniSite = asCallable(service.unpublishMiniSite)
export const deleteMiniSite = asCallable(service.deleteMiniSite)
export const recordMiniSiteEvent = asCallable(service.recordMiniSiteEvent)
