import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './authContext.js'

function createClient(overrides = {}) {
  let onUser
  let onError
  const unsubscribe = vi.fn()
  const client = {
    configurationError: null,
    observeAuthState(userObserver, errorObserver) {
      onUser = userObserver
      onError = errorObserver
      return unsubscribe
    },
    async signInWithGoogle() {
      return {
        user: {
          uid: 'user-1',
          displayName: 'Ada',
          email: 'ada@example.com',
          photoURL: null,
        },
      }
    },
    async signOutUser() {},
    ...overrides,
  }

  return {
    client,
    emitUser(user) {
      onUser(user)
    },
    emitError(error) {
      onError(error)
    },
    unsubscribe,
  }
}

function AuthHarness() {
  const {
    user,
    isAuthLoading,
    authError,
    signInWithGoogle,
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
          const signedInUser = await signInWithGoogle()
          setActionResult(signedInUser?.email ?? 'sign-in-failed')
        }}
      >
        Sign in
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
  it('waits for Firebase before exposing the restored user', async () => {
    const fake = createClient()
    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByRole('status').textContent).toBe('loading')

    act(() => {
      fake.emitUser({
        uid: 'user-1',
        displayName: 'Ada',
        email: 'ada@example.com',
        photoURL: null,
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('ready')
      expect(screen.getByTestId('user').textContent).toBe('ada@example.com')
    })
  })

  it('returns the Google user after successful sign-in', async () => {
    const fake = createClient()
    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByTestId('action-result').textContent).toBe(
        'ada@example.com',
      )
    })
  })

  it('shows a recoverable error when Google sign-in fails', async () => {
    const fake = createClient({
      signInWithGoogle: async () => {
        throw { code: 'auth/popup-blocked' }
      },
    })
    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('allow pop-ups')
      expect(screen.getByTestId('action-result').textContent).toBe(
        'sign-in-failed',
      )
    })
  })

  it('reports successful sign-out to consumers', async () => {
    const fake = createClient()
    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(screen.getByTestId('action-result').textContent).toBe('signed-out')
    })
  })

  it('uses a sign-out-specific message when sign-out fails', async () => {
    const fake = createClient({
      signOutUser: async () => {
        throw { code: 'auth/network-request-failed' }
      },
    })
    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'signing you out',
      )
      expect(screen.getByTestId('action-result').textContent).toBe(
        'sign-out-failed',
      )
    })
  })

  it('retains unexpected Firebase errors in development diagnostics', async () => {
    const originalError = new Error('Unexpected provider failure')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const fake = createClient({
      signInWithGoogle: async () => {
        throw originalError
      },
    })
    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Unexpected Firebase authentication error.',
        originalError,
      )
    })

    consoleError.mockRestore()
  })

  it('unsubscribes from Firebase when the provider unmounts', () => {
    const fake = createClient()
    const view = render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    view.unmount()

    expect(fake.unsubscribe).toHaveBeenCalledOnce()
  })

  it('exposes configuration failure without starting auth observation', () => {
    const observeAuthState = vi.fn()
    const fake = createClient({
      configurationError: 'Firebase sign-in is not configured.',
      observeAuthState,
    })

    render(
      <AuthProvider client={fake.client}>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByRole('status').textContent).toBe('ready')
    expect(screen.getByRole('alert').textContent).toContain('not configured')
    expect(observeAuthState).not.toHaveBeenCalled()
  })

  it('requires consumers to render inside the provider', () => {
    expect(() => render(<AuthHarness />)).toThrow(
      'useAuth must be used within AuthProvider.',
    )
  })
})
