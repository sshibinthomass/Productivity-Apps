import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import TurnstileWidget from '../auth/TurnstileWidget.jsx'
import { useAuth } from '../auth/authContext.js'
import { getSafeReturnPath } from '../auth/returnPath.js'

export default function LoginPage() {
  const { user, isAuthLoading, authError, signInWithEmail, registerWithEmail } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmationRef = useRef(null)
  const returnPath = getSafeReturnPath(location.state?.from)
  const isRegistration = mode === 'register'

  if (isAuthLoading) {
    return <div className="auth-loading" role="status" aria-live="polite"><span className="auth-loading__signal" aria-hidden="true" /><p>Checking your session…</p></div>
  }
  if (user) return <Navigate to={returnPath} replace />

  function switchMode(nextMode) {
    setMode(nextMode)
    setFormError('')
    setTurnstileToken(null)
    setTurnstileReset((value) => value + 1)
  }

  async function submit(event) {
    event.preventDefault()
    setFormError('')
    const submittedToken = turnstileToken
    setTurnstileToken(null)
    setTurnstileReset((value) => value + 1)
    if (!email.trim()) {
      setFormError('Enter your email address.')
      emailRef.current?.focus()
      return
    }
    if (!password) {
      setFormError('Enter your password.')
      passwordRef.current?.focus()
      return
    }
    if (!submittedToken) return
    if (isRegistration) {
      if (password.length < 10) return setFormError('Use at least 10 characters for your password.')
      if (password !== confirmation) {
        setFormError('Passwords must match')
        confirmationRef.current?.focus()
        return
      }
      if (!consentAccepted) return setFormError('Accept the terms and privacy policy to continue.')
    }
    setIsSubmitting(true)
    try {
      if (isRegistration) {
        const result = await registerWithEmail({
          name: email.trim().split('@')[0] || 'Creator',
          email: email.trim(),
          password,
          turnstileToken: submittedToken,
          consentAccepted,
        })
        if (result?.emailVerified) navigate(returnPath, { replace: true })
        else if (result) navigate('/verify-email', { replace: true, state: { email: email.trim() } })
        return
      }
      const result = await signInWithEmail({ email: email.trim(), password, turnstileToken: submittedToken })
      if (result) navigate(returnPath, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page auth-page">
      <section className="login-card auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Public identity / creator access</p>
        <div className="auth-card__identity" aria-hidden="true">IDENTITY / READY TO PUBLISH</div>
        <h1 id="login-title">{isRegistration ? 'Start your public identity.' : 'Welcome back to your sites.'}</h1>
        <p className="login-card__intro">
          {isRegistration ? 'Create one account to make and manage up to five public mini-sites.' : 'Sign in to manage the mini-sites people can find and share.'}
        </p>
        <div className="auth-mode-switch" role="group" aria-label="Account access">
          <button type="button" className={mode === 'sign-in' ? 'auth-mode-switch__active' : ''} aria-pressed={mode === 'sign-in'} onClick={() => switchMode('sign-in')}>Sign in</button>
          <button type="button" className={isRegistration ? 'auth-mode-switch__active' : ''} aria-pressed={isRegistration} onClick={() => switchMode('register')}>Create an account</button>
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" ref={emailRef} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-describedby={formError ? 'login-error' : undefined} />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" ref={passwordRef} type="password" autoComplete={isRegistration ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required aria-describedby={isRegistration ? 'password-help' : formError ? 'login-error' : undefined} />
          {isRegistration && <p id="password-help" className="auth-form__help">Use at least 10 characters.</p>}
          {isRegistration && <>
            <label htmlFor="login-confirm-password">Confirm password</label>
            <input id="login-confirm-password" ref={confirmationRef} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required aria-describedby={formError ? 'login-error' : undefined} />
            <label className="auth-consent" htmlFor="terms-consent"><input id="terms-consent" type="checkbox" required checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} /> <span>I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>
          </>}
          <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileReset} />
          <button className="button button--primary" type="submit" disabled={!turnstileToken || isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Working…' : isRegistration ? 'Create account' : 'Sign in'}</button>
        </form>
        {(formError || authError) && <p id="login-error" className="login-card__error" role="alert">{formError || authError}</p>}
        {isRegistration ? <p className="login-card__public-note">Already have an account? <button className="auth-inline-button" type="button" onClick={() => switchMode('sign-in')}>Sign in instead</button></p> : <p className="login-card__public-note"><Link to="/forgot-password">Forgot password?</Link> Public mini-sites remain viewable by everyone.</p>}
      </section>
    </div>
  )
}
