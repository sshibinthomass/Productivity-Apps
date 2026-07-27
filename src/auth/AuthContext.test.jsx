import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './authContext.js'

const verifiedUser = {
  uid: 'user-1',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  photoURL: null,
  emailVerified: true,
}

function createClient(overrides = {}) {
  return {
    configurationError: null,
    getSession: vi.fn().mockResolvedValue({ user: verifiedUser }),
    signInEmail: vi.fn().mockResolvedValue({ user: verifiedUser }),
    registerEmail: vi.fn(),
    resendVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function AuthHarness() {
  const {
    user,
    isAuthLoading,
    authError,
    signInWithEmail,
    refreshSession,
    signOutUser,
  } = useAuth()
  const [actionResult, setActionResult] = useState('')

  return (
    <div>
      <p role="status">{isAuthLoading ? 'loading' : 'ready'}</p>
      <p data-testid="user">{user?.email ?? 'signed-out'}</p>
      {authError && <p role="alert">{authError}</p>}
      <p data-testid="action-result">{actionResult}</p>
      <button
        type="button"
        onClick={async () => {
          const signedInUser = await signInWithEmail({
            email: 'ada@example.com',
            password: 'long-password',
            turnstileToken: 'turnstile-token',
          })
          setActionResult(signedInUser?.email ?? 'sign-in-failed')
        }}
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={async () => {
          const currentUser = await refreshSession()
          setActionResult(currentUser?.email ?? 'session-expired')
        }}
      >
        Refresh session
      </button>
      <button
        type="button"
        onClick={async () => {
          const didSignOut = await signOutUser()
          setActionResult(didSignOut ? 'signed-out' : 'sign-out-failed')
        }}
      >
        Sign out
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  it('restores the existing email session before exposing the user', async () => {
    const client = createClient()
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByRole('status').textContent).toBe('loading')

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('ready')
      expect(screen.getByTestId('user').textContent).toBe('ada@example.com')
    })
  })

  it('returns the normalized user after successful email sign-in', async () => {
    const client = createClient({ getSession: vi.fn().mockResolvedValue({ user: null }) })
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByTestId('action-result').textContent).toBe('ada@example.com')
      expect(client.signInEmail).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'long-password',
        turnstileToken: 'turnstile-token',
      })
    })
  })

  it('shows an email-password error for invalid credentials', async () => {
    const client = createClient({
      getSession: vi.fn().mockResolvedValue({ user: null }),
      signInEmail: vi.fn().mockRejectedValue({ code: 'INVALID_EMAIL_OR_PASSWORD' }),
    })
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Incorrect email or password')
      expect(screen.getByTestId('action-result').textContent).toBe('sign-in-failed')
    })
  })

  it('requires email verification before treating a sign-in as authenticated', async () => {
    const client = createClient({
      getSession: vi.fn().mockResolvedValue({ user: null }),
      signInEmail: vi.fn().mockResolvedValue({
        user: { ...verifiedUser, emailVerified: false },
      }),
    })
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Verify your email')
      expect(screen.getByTestId('user').textContent).toBe('signed-out')
    })
  })

  it('clears the user after successful sign-out', async () => {
    const client = createClient()
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    await screen.findByText('ada@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(screen.getByTestId('action-result').textContent).toBe('signed-out')
      expect(screen.getByTestId('user').textContent).toBe('signed-out')
    })
  })

  it('clears a stale user when the session expires', async () => {
    const client = createClient()
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    await screen.findByText('ada@example.com')
    client.getSession.mockResolvedValueOnce({ user: null })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh session' }))

    await waitFor(() => {
      expect(screen.getByTestId('action-result').textContent).toBe('session-expired')
      expect(screen.getByTestId('user').textContent).toBe('signed-out')
    })
  })

  it('exposes configuration failure without requesting a session', () => {
    const getSession = vi.fn()
    const client = createClient({
      configurationError: 'Email and password sign-in is not configured.',
      getSession,
    })
    render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByRole('status').textContent).toBe('ready')
    expect(screen.getByRole('alert').textContent).toContain('not configured')
    expect(getSession).not.toHaveBeenCalled()
  })

  it('does not update state when a session request completes after unmount', async () => {
    let resolveSession
    const getSession = vi.fn(() => new Promise((resolve) => {
      resolveSession = resolve
    }))
    const client = createClient({ getSession })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(
      <AuthProvider client={client}>
        <AuthHarness />
      </AuthProvider>,
    )

    view.unmount()
    resolveSession({ user: verifiedUser })
    await Promise.resolve()

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('requires consumers to render inside the provider', () => {
    expect(() => render(<AuthHarness />)).toThrow(
      'useAuth must be used within AuthProvider.',
    )
  })
})
