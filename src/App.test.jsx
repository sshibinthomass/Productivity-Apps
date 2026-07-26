import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './auth/authContext.js'
import App from './App.jsx'
import ThemeProvider from './theme/ThemeProvider.jsx'

vi.mock('./auth/authContext.js', () => ({
  useAuth: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function renderAt(path, registry) {
  useAuth.mockReturnValue({
    user: null,
    isAuthLoading: false,
    authError: null,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  })

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <App registry={registry} />
      </ThemeProvider>
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

  it('keeps JSON Formatter public for a signed-out user', () => {
    renderAt('/json-formatter')

    expect(screen.getByLabelText('Input JSON')).toBeTruthy()
    expect(screen.getByLabelText('Formatted JSON')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })

  it('keeps Text Comparison public for a signed-out user', () => {
    renderAt('/text-comparison')

    expect(screen.getByLabelText('Text 1 / Original')).toBeTruthy()
    expect(screen.getByLabelText('Text 2 / Revised')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })

  it('keeps QR Generator public for a signed-out user', () => {
    renderAt('/qr-generator')

    expect(screen.getByLabelText('Website URL')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })

  it('applies the protected-route boundary to opted-in registry apps', () => {
    const PrivateFixture = () => <p>Private fixture app</p>
    const protectedRegistry = [
      {
        id: 'private-fixture',
        path: '/private-fixture',
        status: 'available',
        requiresAuth: true,
        component: PrivateFixture,
      },
    ]

    renderAt('/private-fixture', protectedRegistry)

    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeTruthy()
    expect(screen.queryByText('Private fixture app')).toBeNull()
  })
})
