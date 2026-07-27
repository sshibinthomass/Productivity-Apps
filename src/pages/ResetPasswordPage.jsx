import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/authContext.js'

function isInvalidToken(error) {
  return /(?:INVALID|EXPIRED).*(?:TOKEN|RESET)|(?:TOKEN|RESET).*(?:INVALID|EXPIRED)/i.test(error || '')
}

export default function ResetPasswordPage() {
  const { authError, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const passwordRef = useRef(null)
  const confirmationRef = useRef(null)
  const token = searchParams.get('token')
  const callbackError = searchParams.get('error')
  const invalidToken = !token || isInvalidToken(callbackError) || isInvalidToken(authError)
  const tokenError = invalidToken ? 'This reset link is expired or invalid. Request a new reset link.' : ''

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (invalidToken || isSubmitting) return
    if (password.length < 10) {
      setError('Use at least 10 characters for your new password.')
      passwordRef.current?.focus()
      return
    }
    if (password !== confirmation) {
      setError('Passwords must match')
      confirmationRef.current?.focus()
      return
    }
    setIsSubmitting(true)
    try {
      const result = await resetPassword({ token, newPassword: password })
      if (result) navigate('/login', { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return <div className="login-page auth-page"><section className="login-card auth-card" aria-labelledby="reset-password-title">
    <p className="eyebrow">Public identity / recovery</p><div className="auth-card__identity" aria-hidden="true">IDENTITY / NEW KEY</div><h1 id="reset-password-title">Choose a new password.</h1>
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={isSubmitting}>
      <label htmlFor="reset-password">New password</label><input id="reset-password" ref={passwordRef} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={invalidToken || isSubmitting} required aria-describedby="reset-password-help reset-error" /><p id="reset-password-help" className="auth-form__help">Use at least 10 characters.</p>
      <label htmlFor="reset-confirmation">Confirm new password</label><input id="reset-confirmation" ref={confirmationRef} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={invalidToken || isSubmitting} required aria-describedby="reset-error" />
      <button className="button button--primary" type="submit" disabled={invalidToken || isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Setting new password…' : 'Set new password'}</button>
    </form>
    <p id="reset-error" className="login-card__error" role="alert" hidden={!(tokenError || error || authError)}>{tokenError || error || authError}</p>
    {invalidToken && <p className="auth-form__notice"><Link to="/forgot-password">Request a new reset link</Link></p>}
    <p className="login-card__public-note"><Link to="/login">Back to sign in</Link></p>
  </section></div>
}
