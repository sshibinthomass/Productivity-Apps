import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import AuthControls from './AuthControls.jsx'

vi.mock('../auth/authContext.js', () => ({
  useAuth: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('AuthControls', () => {
  it('announces session restoration without offering a premature action', () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: true,
      signOutUser: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AuthControls />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status').textContent).toContain('Checking session')
    expect(
      screen.queryByRole('link', { name: 'Sign in with Google' }),
    ).toBeNull()
  })

  it('links signed-out users to the public login page', () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: false,
      signOutUser: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AuthControls />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Sign in with Google' }).getAttribute(
        'href',
      ),
    ).toBe('/login')
  })

  it('shows the signed-in identity and signs out from the header', async () => {
    const signOutUser = vi.fn().mockResolvedValue(true)
    useAuth.mockReturnValue({
      user: {
        uid: 'user-1',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        photoURL: 'https://example.com/ada.png',
      },
      isAuthLoading: false,
      signOutUser,
    })

    render(
      <MemoryRouter>
        <AuthControls />
      </MemoryRouter>,
    )

    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(
      screen.getByRole('img', { name: 'Ada Lovelace profile' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(signOutUser).toHaveBeenCalledOnce()
    })
  })

  it('uses the email when Google has no display name or profile image', () => {
    useAuth.mockReturnValue({
      user: {
        uid: 'user-1',
        displayName: null,
        email: 'ada@example.com',
        photoURL: null,
      },
      isAuthLoading: false,
      signOutUser: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AuthControls />
      </MemoryRouter>,
    )

    expect(screen.getByText('ada@example.com')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
