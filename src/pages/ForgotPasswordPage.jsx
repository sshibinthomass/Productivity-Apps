import { useState } from 'react'
import { Link } from 'react-router-dom'
import TurnstileWidget from '../auth/TurnstileWidget.jsx'
import { useAuth } from '../auth/authContext.js'

export default function ForgotPasswordPage() {
  const { authError, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [sent, setSent] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const submittedToken = turnstileToken
    setTurnstileToken(null)
    setTurnstileReset((value) => value + 1)
    if (!submittedToken) return
    await requestPasswordReset({
      email,
      turnstileToken: submittedToken,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
  }

  return (
    <div className="login-page auth-page">
      <section className="login-card auth-card" aria-labelledby="forgot-password-title">
        <p className="eyebrow">Public identity / recovery</p>
        <div className="auth-card__identity" aria-hidden="true">IDENTITY / KEEP CONTROL</div>
        <h1 id="forgot-password-title">Reset your password.</h1>
        <p className="login-card__intro">Enter your account email. We do not reveal whether an address has an account.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="forgot-email">Email address</label>
          <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileReset} />
          <button className="button button--primary" type="submit" disabled={!email || !turnstileToken}>Send reset link</button>
        </form>
        {sent && <p className="auth-form__notice" role="status">If an account exists for that email, a reset link is on its way.</p>}
        {authError && <p className="login-card__error" role="alert">{authError}</p>}
        <p className="login-card__public-note"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  )
}
