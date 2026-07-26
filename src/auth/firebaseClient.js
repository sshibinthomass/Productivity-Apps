import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'

const REQUIRED_CONFIG = [
  ['VITE_FIREBASE_API_KEY', 'apiKey'],
  ['VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'],
  ['VITE_FIREBASE_PROJECT_ID', 'projectId'],
  ['VITE_FIREBASE_APP_ID', 'appId'],
]

const CONFIGURATION_ERROR =
  'Firebase sign-in is not configured. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.'

const EXPECTED_AUTH_ERROR_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/network-request-failed',
  'auth/unauthorized-domain',
  'auth/configuration-not-found',
])

const firebaseSdk = {
  getApp,
  getApps,
  initializeApp,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
}

export function readFirebaseConfig(env) {
  const hasMissingValue = REQUIRED_CONFIG.some(
    ([envName]) =>
      typeof env[envName] !== 'string' || env[envName].trim().length === 0,
  )

  if (hasMissingValue) {
    return {
      config: null,
      configurationError: CONFIGURATION_ERROR,
    }
  }

  return {
    config: Object.fromEntries(
      REQUIRED_CONFIG.map(([envName, configName]) => [
        configName,
        env[envName].trim(),
      ]),
    ),
    configurationError: null,
  }
}

export function isUnexpectedAuthError(error) {
  return !EXPECTED_AUTH_ERROR_CODES.has(error?.code)
}

export function getAuthErrorMessage(error, action = 'signIn') {
  if (action === 'signOut') {
    if (error?.code === 'auth/configuration-not-found') {
      return CONFIGURATION_ERROR
    }

    if (error?.code === 'auth/network-request-failed') {
      return 'A network problem prevented Google from signing you out. Check your connection and try again.'
    }

    return 'Google could not sign you out. Please try again.'
  }

  switch (error?.code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Please allow pop-ups for this site and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google sign-in window was closed before sign-in finished. Please try again.'
    case 'auth/network-request-failed':
      return 'A network problem interrupted Google sign-in. Check your connection and try again.'
    case 'auth/unauthorized-domain':
      return 'This site is not authorized for Google sign-in. Ask the site owner to check the Firebase authorized domains.'
    case 'auth/configuration-not-found':
      return CONFIGURATION_ERROR
    default:
      return 'Google could not sign you in. Please try again.'
  }
}

function createMissingConfigurationError() {
  const error = new Error(CONFIGURATION_ERROR)
  error.code = 'auth/configuration-not-found'
  return error
}

export function createFirebaseClient(env, sdk = firebaseSdk) {
  const { config, configurationError } = readFirebaseConfig(env)

  if (configurationError) {
    return {
      configurationError,
      observeAuthState() {
        return () => {}
      },
      signInWithGoogle() {
        return Promise.reject(createMissingConfigurationError())
      },
      signOutUser() {
        return Promise.reject(createMissingConfigurationError())
      },
    }
  }

  const app =
    sdk.getApps().length > 0 ? sdk.getApp() : sdk.initializeApp(config)
  const auth = sdk.getAuth(app)

  return {
    configurationError: null,
    observeAuthState(onUser, onError) {
      return sdk.onAuthStateChanged(auth, onUser, onError)
    },
    signInWithGoogle() {
      return sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider())
    },
    signOutUser() {
      return sdk.signOut(auth)
    },
  }
}

export const firebaseClient = createFirebaseClient(import.meta.env)
