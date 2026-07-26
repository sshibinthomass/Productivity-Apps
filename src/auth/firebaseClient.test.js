import { describe, expect, it } from 'vitest'
import {
  createFirebaseClient,
  getAuthErrorMessage,
  readFirebaseConfig,
} from './firebaseClient.js'

describe('readFirebaseConfig', () => {
  it('reports every required variable when Firebase is not configured', () => {
    expect(readFirebaseConfig({})).toEqual({
      config: null,
      configurationError:
        'Firebase is not configured. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, and VITE_FIREBASE_STORAGE_BUCKET.',
    })
  })

  it('returns the Firebase web configuration when all values exist', () => {
    expect(
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: 'key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'example',
        VITE_FIREBASE_APP_ID: 'app-id',
        VITE_FIREBASE_STORAGE_BUCKET: 'example.firebasestorage.app',
      }),
    ).toEqual({
      config: {
        apiKey: 'key',
        authDomain: 'example.firebaseapp.com',
        projectId: 'example',
        appId: 'app-id',
        storageBucket: 'example.firebasestorage.app',
      },
      configurationError: null,
    })
  })

  it('treats whitespace-only values as missing configuration', () => {
    expect(
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: ' ',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'example',
        VITE_FIREBASE_APP_ID: 'app-id',
      }).config,
    ).toBeNull()
  })

  it('requires a Storage bucket for image publishing', () => {
    expect(
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: 'key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'example',
        VITE_FIREBASE_APP_ID: 'app-id',
      }).config,
    ).toBeNull()
  })
})

describe('getAuthErrorMessage', () => {
  it.each([
    ['auth/popup-blocked', 'allow pop-ups'],
    ['auth/popup-closed-by-user', 'closed'],
    ['auth/cancelled-popup-request', 'closed'],
    ['auth/network-request-failed', 'network'],
    ['auth/unauthorized-domain', 'not authorized'],
    ['auth/configuration-not-found', 'not configured'],
    ['unknown', 'could not sign you in'],
  ])('maps %s to a recoverable message', (code, expectedText) => {
    expect(getAuthErrorMessage({ code }).toLowerCase()).toContain(expectedText)
  })

  it('uses action-specific language for sign-out failures', () => {
    expect(
      getAuthErrorMessage(
        { code: 'auth/network-request-failed' },
        'signOut',
      ).toLowerCase(),
    ).toContain('signing you out')
  })
})

describe('createFirebaseClient', () => {
  it('does not initialize Firebase when configuration is missing', async () => {
    const client = createFirebaseClient({})

    expect(client.configurationError).toContain('not configured')
    await expect(client.signInWithGoogle()).rejects.toMatchObject({
      code: 'auth/configuration-not-found',
    })
  })

  it('adapts the Firebase SDK behind the application auth interface', async () => {
    const observedUser = {
      uid: 'user-1',
      displayName: 'Ada',
      email: 'ada@example.com',
      photoURL: null,
    }
    let receivedUser = null
    let signedOut = false
    let providerId = null
    let appCheckOptions = null
    const unsubscribe = () => {}
    class FakeGoogleAuthProvider {
      constructor() {
        this.providerId = 'google.com'
      }
    }
    const sdk = {
      getApps: () => [],
      getApp: () => {
        throw new Error('No existing app expected')
      },
      initializeApp: (config) => ({ config }),
      getAuth: (app) => ({ app }),
      getFirestore: (app) => ({ type: 'firestore', app }),
      getStorage: (app) => ({ type: 'storage', app }),
      getFunctions: (app, region) => ({ type: 'functions', app, region }),
      initializeAppCheck: (app, options) => {
        appCheckOptions = { app, options }
        return { type: 'app-check', app }
      },
      ReCaptchaEnterpriseProvider: class {
        constructor(siteKey) {
          this.siteKey = siteKey
        }
      },
      GoogleAuthProvider: FakeGoogleAuthProvider,
      onAuthStateChanged: (_auth, onUser) => {
        onUser(observedUser)
        return unsubscribe
      },
      signInWithPopup: async (_auth, provider) => {
        providerId = provider.providerId
        return { user: observedUser }
      },
      signOut: async () => {
        signedOut = true
      },
    }

    const client = createFirebaseClient(
      {
        VITE_FIREBASE_API_KEY: 'key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'example',
        VITE_FIREBASE_APP_ID: 'app-id',
        VITE_FIREBASE_STORAGE_BUCKET: 'example.firebasestorage.app',
        VITE_FIREBASE_APP_CHECK_SITE_KEY: 'enterprise-key',
        VITE_FIREBASE_FUNCTIONS_REGION: 'europe-west1',
      },
      sdk,
    )

    const returnedUnsubscribe = client.observeAuthState((user) => {
      receivedUser = user
    })
    const credential = await client.signInWithGoogle()
    await client.signOutUser()

    expect(client.configurationError).toBeNull()
    expect(receivedUser).toEqual(observedUser)
    expect(returnedUnsubscribe).toBe(unsubscribe)
    expect(credential.user).toEqual(observedUser)
    expect(providerId).toBe('google.com')
    expect(signedOut).toBe(true)
    expect(client.db.type).toBe('firestore')
    expect(client.storage.type).toBe('storage')
    expect(client.functions.region).toBe('europe-west1')
    expect(client.appCheck.type).toBe('app-check')
    expect(appCheckOptions.options.provider.siteKey).toBe('enterprise-key')
    expect(appCheckOptions.options.isTokenAutoRefreshEnabled).toBe(true)
  })

  it('keeps optional App Check disabled when no site key is configured', () => {
    const sdk = {
      getApps: () => [],
      initializeApp: (config) => ({ config }),
      getAuth: () => ({}),
      getFirestore: () => ({}),
      getStorage: () => ({}),
      getFunctions: (_app, region) => ({ region }),
      initializeAppCheck: () => {
        throw new Error('App Check should not initialize')
      },
      GoogleAuthProvider: class {},
    }

    const client = createFirebaseClient(
      {
        VITE_FIREBASE_API_KEY: 'key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'example',
        VITE_FIREBASE_APP_ID: 'app-id',
        VITE_FIREBASE_STORAGE_BUCKET: 'example.firebasestorage.app',
      },
      sdk,
    )

    expect(client.appCheck).toBeNull()
    expect(client.functions.region).toBe('europe-west1')
  })
})
