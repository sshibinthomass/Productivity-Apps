import { useRef, useState } from 'react'
import { useAuth } from '../auth/authContext.js'

export default function AccountSecurityPage() {
  const { authError, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentPasswordRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmationRef = useRef(null)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaved(false)
    if (isSubmitting) return
    if (!currentPassword) {
      setError('Enter your current password.')
      currentPasswordRef.current?.focus()
      return
    }
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
      const result = await changePassword({ currentPassword, newPassword: password })
      if (result) {
        setCurrentPassword('')
        setPassword('')
        setConfirmation('')
        setSaved(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="account-security" aria-labelledby="account-security-title">
      <p className="eyebrow">Account / security</p>
      <h1 id="account-security-title">Keep your creator account secure.</h1>
      <p>Changing your password signs out every other session using this account.</p>
      <form className="auth-form account-security__form" onSubmit={submit} noValidate aria-busy={isSubmitting}>
        <label htmlFor="current-password">Current password</label>
        <input id="current-password" ref={currentPasswordRef} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={isSubmitting} required aria-describedby="account-security-error" />
        <label htmlFor="new-password">New password</label>
        <input id="new-password" ref={passwordRef} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} required aria-describedby="account-security-password-help account-security-error" />
        <p id="account-security-password-help" className="auth-form__help">Use at least 10 characters.</p>
        <label htmlFor="new-password-confirmation">Confirm new password</label>
        <input id="new-password-confirmation" ref={confirmationRef} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={isSubmitting} required aria-describedby="account-security-error" />
        <button className="button button--primary" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Changing password…' : 'Change password'}</button>
      </form>
      <p id="account-security-error" className="login-card__error" role="alert" hidden={!(error || authError)}>{error || authError}</p>
      {saved && <p className="auth-form__notice" role="status">Password changed. Other signed-in sessions have been revoked.</p>}
    </section>
  )
}
