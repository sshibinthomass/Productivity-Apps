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
        'Firebase sign-in is not configured. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.',
    })
  })

  it('returns the Firebase web configuration when all values exist', () => {
    expect(
      readFirebaseConfig({
        VITE_FIREBASE_API_KEY: 'key',
        VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'example',
        VITE_FIREBASE_APP_ID: 'app-id',
      }),
    ).toEqual({
      config: {
        apiKey: 'key',
        authDomain: 'example.firebaseapp.com',
        projectId: 'example',
        appId: 'app-id',
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
  })
})
