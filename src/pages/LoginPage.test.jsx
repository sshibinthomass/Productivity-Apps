import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import LoginPage from './LoginPage.jsx'

vi.mock('../auth/authContext.js', () => ({ useAuth: vi.fn() }))
vi.mock('../auth/TurnstileWidget.jsx', () => ({
  default: ({ onVerify }) => (
    <button type="button" onClick={() => onVerify('turnstile-token')}>
      Complete security check
    </button>
  ),
}))

const signedOut = {
  user: null,
  isAuthLoading: false,
  authError: null,
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
}

function renderLogin(from) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/private" element={<p>Private app</p>} />
        <Route path="/verify-email" element={<p>Verify email</p>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => vi.clearAllMocks())

describe('LoginPage', () => {
  it('uses labelled credential fields with useful autocomplete values', () => {
    useAuth.mockReturnValue(signedOut)
    renderLogin('/')

    expect(screen.getByLabelText('Email address').getAttribute('autocomplete')).toBe('email')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password')
  })

  it('returns only to the requested internal route after email sign-in', async () => {
    const signInWithEmail = vi.fn().mockResolvedValue({ emailVerified: true })
    useAuth.mockReturnValue({ ...signedOut, signInWithEmail })
    renderLogin('/private')

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1))

    await waitFor(() => expect(screen.getByText('Private app')).toBeTruthy())
    expect(signInWithEmail).toHaveBeenCalledWith({
      email: 'person@example.com', password: 'long-password', turnstileToken: 'turnstile-token',
    })
  })

  it('does not submit registration until the password, consent, and security check are valid', () => {
    useAuth.mockReturnValue(signedOut)
    renderLogin('/')
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    expect(screen.getByRole('button', { name: 'Create account' }).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('alert').textContent).toContain('Passwords must match')
    expect(document.activeElement).toBe(screen.getByLabelText('Confirm password'))
  })

  it('moves keyboard focus to the first blank credential field', () => {
    const signInWithEmail = vi.fn()
    useAuth.mockReturnValue({ ...signedOut, signInWithEmail })
    renderLogin('/')
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1))

    expect(document.activeElement).toBe(screen.getByLabelText('Email address'))
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it('creates an email account after consent and sends the creator to verification', async () => {
    const registerWithEmail = vi.fn().mockResolvedValue({ emailVerified: false })
    useAuth.mockReturnValue({ ...signedOut, registerWithEmail })
    renderLogin('/')
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByLabelText(/I agree to the Terms/))
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe('/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy')
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByText('Verify email')).toBeTruthy())
    expect(registerWithEmail).toHaveBeenCalledWith(expect.objectContaining({
      name: 'person', email: 'person@example.com', password: 'long-password',
      consentAccepted: true, turnstileToken: 'turnstile-token',
    }))
  })

  it('falls back home for an unsafe protected-route return value', async () => {
    const signInWithEmail = vi.fn().mockResolvedValue({ emailVerified: true })
    useAuth.mockReturnValue({ ...signedOut, signInWithEmail })
    renderLogin('https://attacker.example')
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1))
    await waitFor(() => expect(screen.getByText('Home page')).toBeTruthy())
  })

  it('handles Better Auth verification callbacks with a safe resend path', () => {
    useAuth.mockReturnValue(signedOut)
    render(
      <MemoryRouter initialEntries={['/login?error=INVALID_TOKEN']}>
        <Routes><Route path="/login" element={<LoginPage />} /><Route path="/verify-email" element={<p>Verification destination</p>} /></Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert').textContent).toContain('verification link is invalid or has expired')
    expect(screen.getByRole('link', { name: 'Resend verification email' }).getAttribute('href')).toBe('/verify-email')
  })

  it('rejects malformed email input before consuming the security check', () => {
    const signInWithEmail = vi.fn()
    useAuth.mockReturnValue({ ...signedOut, signInWithEmail })
    renderLogin('/')
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1))

    expect(screen.getByRole('alert').textContent).toContain('valid email')
    expect(document.activeElement).toBe(screen.getByLabelText('Email address'))
    expect(signInWithEmail).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email address').getAttribute('aria-describedby')).toBe('login-error')
  })

  it('focuses mandatory registration consent before consuming Turnstile', () => {
    useAuth.mockReturnValue(signedOut)
    renderLogin('/')
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(document.activeElement).toBe(screen.getByLabelText(/I agree to the Terms/))
  })
})
