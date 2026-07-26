import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext.js'
import { getSafeReturnPath } from '../auth/returnPath.js'

export default function LoginPage() {
  const {
    user,
    isAuthLoading,
    authError,
    signInWithGoogle,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const returnPath = getSafeReturnPath(location.state?.from)

  if (isAuthLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <span className="auth-loading__signal" aria-hidden="true" />
        <p>Checking your session…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={returnPath} replace />
  }

  async function handleGoogleSignIn() {
    setIsSigningIn(true)

    try {
      const signedInUser = await signInWithGoogle()

      if (signedInUser) {
        navigate(returnPath, { replace: true })
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">One account / Every protected tool</p>
        <h1 id="login-title">Pick up where you left off.</h1>
        <p className="login-card__intro">
          Sign in with any Google account to use apps that save or personalize
          your work. Public tools stay open to everyone.
        </p>

        <button
          className="login-card__google"
          type="button"
          disabled={isSigningIn}
          aria-busy={isSigningIn}
          onClick={handleGoogleSignIn}
        >
          <span className="login-card__google-mark" aria-hidden="true">
            G
          </span>
          {isSigningIn ? 'Opening Google…' : 'Continue with Google'}
        </button>

        {authError && (
          <p className="login-card__error" role="alert">
            {authError}
          </p>
        )}

        <p className="login-card__public-note">
          Multi Link Opener never requires an account.
        </p>
      </section>
    </div>
  )
}
