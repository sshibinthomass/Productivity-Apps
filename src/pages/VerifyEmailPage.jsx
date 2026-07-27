import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import TurnstileWidget from '../auth/TurnstileWidget.jsx'
import { useAuth } from '../auth/authContext.js'

const resendDelay = 60

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function VerifyEmailPage() {
  const { authError, resendVerification } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef(null)
  const timerRef = useRef(null)
  const mountedRef = useRef(true)
  const attemptRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      attemptRef.current += 1
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  async function resend(event) {
    event.preventDefault()
    setError('')
    if (isSubmitting || cooldown) return
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
    const attempt = ++attemptRef.current
    try {
      const result = await resendVerification({ email: email.trim(), turnstileToken: submittedToken, callbackURL: `${window.location.origin}/login` })
      if (!result || !mountedRef.current || attempt !== attemptRef.current) return
      setMessage('Verification email sent. Check your inbox, then sign in.')
      setCooldown(resendDelay)
      timerRef.current = window.setInterval(() => {
        setCooldown((seconds) => {
          if (seconds <= 1) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
            return 0
          }
          return seconds - 1
        })
      }, 1000)
    } finally {
      if (mountedRef.current && attempt === attemptRef.current) setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page auth-page">
      <section className="login-card auth-card" aria-labelledby="verify-email-title">
        <p className="eyebrow">Public identity / confirmation</p>
        <div className="auth-card__identity" aria-hidden="true">IDENTITY / VERIFY TO PUBLISH</div>
        <h1 id="verify-email-title">Check your inbox.</h1>
        <p className="login-card__intro">Confirm your email before you start building public mini-sites.</p>
        <form className="auth-form" onSubmit={resend} noValidate aria-busy={isSubmitting}>
          <label htmlFor="verify-email">Email address</label>
          <input id="verify-email" ref={emailRef} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting || cooldown > 0} required aria-describedby="verify-error" />
          <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileReset} />
          <button className="button button--primary" type="submit" disabled={!email || !turnstileToken || cooldown > 0 || isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Sending verification email…' : cooldown ? `Resend available in ${cooldown}s` : 'Resend verification email'}
          </button>
        </form>
        <p id="verify-error" className="login-card__error" role="alert" hidden={!(authError || error)}>{error || authError}</p>
        {message && <p className="auth-form__notice" role="status">{message}</p>}
        <p className="login-card__public-note"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  )
}
