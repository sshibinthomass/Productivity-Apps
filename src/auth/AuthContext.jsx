import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  firebaseClient,
  getAuthErrorMessage,
} from './firebaseClient.js'

const AuthContext = createContext(null)

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
      setUser(null)
      setIsAuthLoading(false)
      setAuthError(client.configurationError)
      return undefined
    }

    setIsAuthLoading(true)

    return client.observeAuthState(
      (nextUser) => {
        setUser(nextUser)
        setIsAuthLoading(false)
      },
      (error) => {
        setUser(null)
        setIsAuthLoading(false)
        setAuthError(getAuthErrorMessage(error))
      },
    )
  }, [client])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)

    try {
      const credential = await client.signInWithGoogle()
      return credential.user
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
      return null
    }
  }, [client])

  const signOutUser = useCallback(async () => {
    setAuthError(null)

    try {
      await client.signOutUser()
      return true
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
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

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
