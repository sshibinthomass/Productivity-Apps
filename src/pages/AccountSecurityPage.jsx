import { useRef, useState } from 'react'
import { useAuth } from '../auth/authContext.js'

export default function AccountSecurityPage() {
  const { authError, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const confirmationRef = useRef(null)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaved(false)
    if (password.length < 10) return setError('Use at least 10 characters for your new password.')
    if (password !== confirmation) {
      setError('Passwords must match')
      confirmationRef.current?.focus()
      return
    }
    const result = await changePassword({ currentPassword, newPassword: password })
    if (result) {
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
      setSaved(true)
    }
  }

  return (
    <section className="account-security" aria-labelledby="account-security-title">
      <p className="eyebrow">Account / security</p>
      <h1 id="account-security-title">Keep your creator account secure.</h1>
      <p>Changing your password signs out every other session using this account.</p>
      <form className="auth-form account-security__form" onSubmit={submit}>
        <label htmlFor="current-password">Current password</label>
        <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <p className="auth-form__help">Use at least 10 characters.</p>
        <label htmlFor="new-password-confirmation">Confirm new password</label>
        <input id="new-password-confirmation" ref={confirmationRef} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        <button className="button button--primary" type="submit">Change password</button>
      </form>
      {(error || authError) && <p className="login-card__error" role="alert">{error || authError}</p>}
      {saved && <p className="auth-form__notice" role="status">Password changed. Other signed-in sessions have been revoked.</p>}
    </section>
  )
}
