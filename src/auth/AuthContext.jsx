import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { authClient } from './authClient.js'
import { AuthContext } from './authContext.js'

function describeAuthError(error, action) {
  const code = String(error?.code ?? '').toLowerCase()

  if (action === 'signOut') {
    return 'We could not sign you out. Please try again.'
  }
  if (code.includes('invalid_email_or_password') || code.includes('invalid_credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (code.includes('email_not_verified') || code.includes('unverified')) {
    return 'Verify your email before signing in.'
  }
  if (code.includes('invalid_consent')) {
    return 'Accept the terms and privacy policy to continue.'
  }

  return error?.message || 'We could not complete your request. Please try again.'
}

export function AuthProvider({ children, client = authClient }) {
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(!client.configurationError)
  const [authError, setAuthError] = useState(client.configurationError ?? null)
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    if (client.configurationError) {
      return () => {
        isMounted.current = false
      }
    }

    let cancelled = false
    async function restoreSession() {
      try {
        const session = await client.getSession()
        if (cancelled) return
        setUser(session?.user ?? null)
        setAuthError(null)
      } catch (error) {
        if (cancelled) return
        setUser(null)
        setAuthError(describeAuthError(error, 'restoreSession'))
      } finally {
        if (!cancelled) setIsAuthLoading(false)
      }
    }

    restoreSession()

    return () => {
      cancelled = true
      isMounted.current = false
    }
  }, [client])

  const refreshSession = useCallback(async () => {
    if (client.configurationError) return null
    setAuthError(null)

    try {
      const session = await client.getSession()
      const nextUser = session?.user ?? null
      if (isMounted.current) {
        setUser(nextUser)
        setIsAuthLoading(false)
      }
      return nextUser
    } catch (error) {
      if (isMounted.current) {
        setUser(null)
        setIsAuthLoading(false)
        setAuthError(describeAuthError(error, 'refreshSession'))
      }
      return null
    }
  }, [client])

  const signInWithEmail = useCallback(async (credentials) => {
    setAuthError(null)

    try {
      const result = await client.signInEmail(credentials)
      const nextUser = result?.user ?? null
      if (!nextUser?.emailVerified) {
        if (isMounted.current) {
          setUser(null)
          setAuthError('Verify your email before signing in.')
        }
        return null
      }
      if (isMounted.current) setUser(nextUser)
      return nextUser
    } catch (error) {
      if (isMounted.current) setAuthError(describeAuthError(error, 'signIn'))
      return null
    }
  }, [client])

  const registerWithEmail = useCallback(async (registration) => {
    setAuthError(null)
    try {
      const result = await client.registerEmail(registration)
      const nextUser = result?.user ?? null
      if (isMounted.current && nextUser?.emailVerified) setUser(nextUser)
      return nextUser
    } catch (error) {
      if (isMounted.current) setAuthError(describeAuthError(error, 'register'))
      return null
    }
  }, [client])

  const runRequest = useCallback(async (action, request) => {
    setAuthError(null)
    try {
      return await request()
    } catch (error) {
      if (isMounted.current) setAuthError(describeAuthError(error, action))
      return null
    }
  }, [])

  const resendVerification = useCallback(
    (request) => runRequest('resendVerification', () => client.resendVerification(request)),
    [client, runRequest],
  )
  const requestPasswordReset = useCallback(
    (request) => runRequest('requestPasswordReset', () => client.requestPasswordReset(request)),
    [client, runRequest],
  )
  const resetPassword = useCallback(
    (request) => runRequest('resetPassword', () => client.resetPassword(request)),
    [client, runRequest],
  )
  const changePassword = useCallback(
    (request) => runRequest('changePassword', () => client.changePassword(request)),
    [client, runRequest],
  )

  const signOutUser = useCallback(async () => {
    setAuthError(null)
    try {
      await client.signOut()
      if (isMounted.current) setUser(null)
      return true
    } catch (error) {
      if (isMounted.current) setAuthError(describeAuthError(error, 'signOut'))
      return false
    }
  }, [client])

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      authError,
      signInWithEmail,
      registerWithEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      changePassword,
      refreshSession,
      signOutUser,
    }),
    [
      user,
      isAuthLoading,
      authError,
      signInWithEmail,
      registerWithEmail,
      resendVerification,
      requestPasswordReset,
      resetPassword,
      changePassword,
      refreshSession,
      signOutUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
