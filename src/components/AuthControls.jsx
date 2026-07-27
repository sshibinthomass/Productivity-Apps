import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/authContext.js'

export default function AuthControls() {
  const { user, isAuthLoading, authError, signOutUser } = useAuth()
  const location = useLocation()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(null)
  const visibleError =
    location.pathname === '/login' ? null : authError || signOutError

  if (isAuthLoading) {
    return (
      <span
        className="auth-controls auth-controls--loading"
        role="status"
        aria-live="polite"
      >
        Checking session
      </span>
    )
  }

  if (!user) {
    return (
      <div className="auth-controls">
        <Link className="auth-link" to="/login">
          Sign in
        </Link>
        {visibleError && (
          <span className="auth-controls__error" role="alert">
            {visibleError}
          </span>
        )}
      </div>
    )
  }

  const identity = user.displayName || user.email || 'Account'

  async function handleSignOut() {
    setIsSigningOut(true)
    setSignOutError(null)

    try {
      const didSignOut = await signOutUser()

      if (!didSignOut) {
        setSignOutError('We could not sign you out. Please try again.')
      }
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="auth-controls">
      <Link className="auth-controls__identity" to="/account/security" aria-label="Manage account security">
        {user.photoURL && (
          <img
            className="auth-controls__avatar"
            src={user.photoURL}
            alt={`${identity} profile`}
            referrerPolicy="no-referrer"
          />
        )}
        <span className="auth-controls__name">{identity}</span>
      </Link>
      <button
        className="auth-sign-out"
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
      {visibleError && (
        <span className="auth-controls__error" role="alert">
          {visibleError}
        </span>
      )}
    </div>
  )
}
