import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext.js'

export default function AuthControls() {
  const { user, isAuthLoading, signOutUser } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

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
      <Link className="auth-link" to="/login">
        Sign in with Google
      </Link>
    )
  }

  const identity = user.displayName || user.email || 'Google account'

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOutUser()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="auth-controls">
      <span className="auth-controls__identity">
        {user.photoURL && (
          <img
            className="auth-controls__avatar"
            src={user.photoURL}
            alt={`${identity} profile`}
            referrerPolicy="no-referrer"
          />
        )}
        <span className="auth-controls__name">{identity}</span>
      </span>
      <button
        className="auth-sign-out"
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
