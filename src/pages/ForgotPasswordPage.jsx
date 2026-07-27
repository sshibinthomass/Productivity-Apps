import { useRef, useState } from 'react'
import { Link } from 'react-router'
import TurnstileWidget from '../auth/TurnstileWidget.jsx'
import { useAuth } from '../auth/authContext.js'

function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }

export default function ForgotPasswordPage() {
  const { authError, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef(null)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (isSubmitting) return
    if (!isValidEmail(email.trim())) {
      setError('Enter a valid email address.')
      emailRef.current?.focus()
      return
    }
    const submittedToken = turnstileToken
    setTurnstileToken(null)
    setTurnstileReset((value) => value + 1)
    if (!submittedToken) return
    setIsSubmitting(true)
    try {
      await requestPasswordReset({ email: email.trim(), turnstileToken: submittedToken, redirectTo: `${window.location.origin}/reset-password` })
      setSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return <div className="login-page auth-page"><section className="login-card auth-card" aria-labelledby="forgot-password-title">
    <p className="eyebrow">Public identity / recovery</p><div className="auth-card__identity" aria-hidden="true">IDENTITY / KEEP CONTROL</div><h1 id="forgot-password-title">Reset your password.</h1><p className="login-card__intro">Enter your account email. We do not reveal whether an address has an account.</p>
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={isSubmitting}>
      <label htmlFor="forgot-email">Email address</label><input id="forgot-email" ref={emailRef} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} required aria-describedby="forgot-error" />
      <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileReset} />
      <button className="button button--primary" type="submit" disabled={!email || !turnstileToken || isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Sending reset link…' : 'Send reset link'}</button>
    </form>
    {sent && <p className="auth-form__notice" role="status">If an account exists for that email, a reset link is on its way.</p>}
    <p id="forgot-error" className="login-card__error" role="alert" hidden={!(error || authError)}>{error || authError}</p>
    <p className="login-card__public-note"><Link to="/login">Back to sign in</Link></p>
  </section></div>
}
