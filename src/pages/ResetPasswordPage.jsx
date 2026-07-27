import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/authContext.js'

export default function ResetPasswordPage() {
  const { authError, resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const confirmationRef = useRef(null)
  const token = searchParams.get('token')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!token) return setError('This reset link is incomplete. Request a new link.')
    if (password.length < 10) return setError('Use at least 10 characters for your new password.')
    if (password !== confirmation) {
      setError('Passwords must match')
      confirmationRef.current?.focus()
      return
    }
    const result = await resetPassword({ token, newPassword: password })
    if (result) setSaved(true)
  }

  return (
    <div className="login-page auth-page">
      <section className="login-card auth-card" aria-labelledby="reset-password-title">
        <p className="eyebrow">Public identity / recovery</p>
        <div className="auth-card__identity" aria-hidden="true">IDENTITY / NEW KEY</div>
        <h1 id="reset-password-title">Choose a new password.</h1>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="reset-password">New password</label>
          <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <p className="auth-form__help">Use at least 10 characters.</p>
          <label htmlFor="reset-confirmation">Confirm new password</label>
          <input id="reset-confirmation" ref={confirmationRef} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          <button className="button button--primary" type="submit">Set new password</button>
        </form>
        {(error || authError) && <p className="login-card__error" role="alert">{error || authError}</p>}
        {saved && <p className="auth-form__notice" role="status">Password changed. You can sign in now.</p>}
        <p className="login-card__public-note"><Link to="/login">Back to sign in</Link></p>
      </section>
    </div>
  )
}
