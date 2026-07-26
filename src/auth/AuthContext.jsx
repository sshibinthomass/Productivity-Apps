import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AuthContext } from './authContext.js'
import {
  firebaseClient,
  getAuthErrorMessage,
  isUnexpectedAuthError,
} from './firebaseClient.js'

function describeAuthError(error, action) {
  if (import.meta.env.DEV && isUnexpectedAuthError(error)) {
    console.error('Unexpected Firebase authentication error.', error)
  }

  return getAuthErrorMessage(error, action)
}

export function AuthProvider({ children, client = firebaseClient }) {
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(
    !client.configurationError,
  )
  const [authError, setAuthError] = useState(
    client.configurationError ?? null,
  )

  useEffect(() => {
    if (client.configurationError) {
      return undefined
    }

    return client.observeAuthState(
      (nextUser) => {
        setUser(nextUser)
        setIsAuthLoading(false)
      },
      (error) => {
        setUser(null)
        setIsAuthLoading(false)
        setAuthError(describeAuthError(error, 'observe'))
      },
    )
  }, [client])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)

    try {
      const credential = await client.signInWithGoogle()
      return credential.user
    } catch (error) {
      setAuthError(describeAuthError(error, 'signIn'))
      return null
    }
  }, [client])

  const signOutUser = useCallback(async () => {
    setAuthError(null)

    try {
      await client.signOutUser()
      return true
    } catch (error) {
      setAuthError(describeAuthError(error, 'signOut'))
      return false
    }
  }, [client])

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      authError,
      signInWithGoogle,
      signOutUser,
    }),
    [user, isAuthLoading, authError, signInWithGoogle, signOutUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
