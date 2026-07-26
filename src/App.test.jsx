import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './auth/authContext.js'
import App from './App.jsx'

vi.mock('./auth/authContext.js', () => ({
  useAuth: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function renderAt(path) {
  useAuth.mockReturnValue({
    user: null,
    isAuthLoading: false,
    authError: null,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  })

  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App authentication routes', () => {
  it('renders the public login route for a signed-out user', () => {
    renderAt('/login')

    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeTruthy()
  })

  it('keeps Multi Link Opener public for a signed-out user', () => {
    renderAt('/multi-link-opener')

    expect(screen.getByLabelText('Your links')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })
})
