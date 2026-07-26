import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import LoginPage from './LoginPage.jsx'

vi.mock('../auth/authContext.js', () => ({
  useAuth: vi.fn(),
}))

const GOOGLE_USER = {
  uid: 'user-1',
  displayName: 'Ada',
  email: 'ada@example.com',
  photoURL: null,
}

function renderLogin(from) {
  const initialEntry = {
    pathname: '/login',
    state: from === undefined ? null : { from },
  }

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/private" element={<p>Private app</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('returns to the requested internal route after Google sign-in', async () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: false,
      authError: null,
      signInWithGoogle: async () => GOOGLE_USER,
    })
    renderLogin('/private?tab=1#item')

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    )

    await waitFor(() => {
      expect(screen.getByText('Private app')).toBeTruthy()
    })
  })

  it('stays available and explains a failed sign-in', async () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: false,
      authError: 'Your browser blocked the popup. Please allow pop-ups.',
      signInWithGoogle: async () => null,
    })
    renderLogin('/private')

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    )

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('allow pop-ups')
      expect(
        screen.getByRole('button', { name: 'Continue with Google' }),
      ).toBeTruthy()
    })
  })

  it('redirects an already signed-in user to the requested route', () => {
    useAuth.mockReturnValue({
      user: GOOGLE_USER,
      isAuthLoading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
    })
    renderLogin('/private')

    expect(screen.getByText('Private app')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })

  it('falls back to home instead of navigating to an external return value', async () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: false,
      authError: null,
      signInWithGoogle: async () => GOOGLE_USER,
    })
    renderLogin('https://attacker.example')

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    )

    await waitFor(() => {
      expect(screen.getByText('Home page')).toBeTruthy()
    })
  })

  it('waits for session restoration before showing the sign-in action', () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthLoading: true,
      authError: null,
      signInWithGoogle: vi.fn(),
    })
    renderLogin()

    expect(screen.getByRole('status').textContent).toContain(
      'Checking your session',
    )
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })
})
