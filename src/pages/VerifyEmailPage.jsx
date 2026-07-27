import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import TurnstileWidget from '../auth/TurnstileWidget.jsx'
import { useAuth } from '../auth/authContext.js'

const resendDelay = 60

export default function VerifyEmailPage() {
  const { authError, resendVerification } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')

  async function resend(event) {
    event.preventDefault()
    const submittedToken = turnstileToken
    setTurnstileToken(null)
    setTurnstileReset((value) => value + 1)
    if (!email || !submittedToken || cooldown) return
    const result = await resendVerification({
      email,
      turnstileToken: submittedToken,
      callbackURL: `${window.location.origin}/login`,
    })
    if (result) {
      setMessage('Verification email sent. Check your inbox, then sign in.')
      setCooldown(resendDelay)
      const timer = window.setInterval(() => {
        setCooldown((seconds) => {
          if (seconds <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return seconds - 1
        })
      }, 1000)
    }
  }

  return (
    <div className="login-page auth-page">
      <section className="login-card auth-card" aria-labelledby="verify-email-title">
        <p className="eyebrow">Public identity / confirmation</p>
        <div className="auth-card__identity" aria-hidden="true">IDENTITY / VERIFY TO PUBLISH</div>
        <h1 id="verify-email-title">Check your inbox.</h1>
        <p className="login-card__intro">Confirm your email before you start building public mini-sites.</p>
        <form className="auth-form" onSubmit={resend}>
          <label htmlFor="verify-email">Email address</label>
          <input id="verify-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileReset} />
          <button className="button button--primary" type="submit" disabled={!email || !turnstileToken || cooldown > 0}>
            {cooldown ? `Resend available in ${cooldown}s` : 'Resend verification email'}
          </button>
        </form>
        {(authError || message) && <p className={authError ? 'login-card__error' : 'auth-form__notice'} role={authError ? 'alert' : 'status'}>{authError || message}</p>}
        <p className="login-card__public-note"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  )
}
