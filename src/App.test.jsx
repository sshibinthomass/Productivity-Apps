import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './auth/authContext.js'
import App from './App.jsx'
import { MiniSiteRepositoryProvider } from './apps/mini-site-builder/data/repositoryContext.jsx'
import ThemeProvider from './theme/ThemeProvider.jsx'

vi.mock('./auth/authContext.js', () => ({
  useAuth: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function renderAt(path, registry, repository) {
  useAuth.mockReturnValue({
    user: null,
    isAuthLoading: false,
    authError: null,
    signInWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    resendVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    refreshSession: vi.fn(),
    signOutUser: vi.fn(),
  })

  const app = <App registry={registry} />
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        {repository ? (
          <MiniSiteRepositoryProvider repository={repository}>
            {app}
          </MiniSiteRepositoryProvider>
        ) : (
          app
        )}
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

  it('protects the standalone mini-site analytics route', () => {
    renderAt('/mini-sites/site-1/analytics')

    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeTruthy()
  })

  it('renders public mini-sites outside the Arvenilo application layout', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue({
        slug: 'maya-studio',
        theme: {},
        seo: { title: 'Maya Studio', description: '' },
        blocks: [
          {
            id: 'profile',
            type: 'profile',
            visible: true,
            content: {
              avatarUrl: '',
              displayName: 'Maya Studio',
              bio: '',
              alt: '',
            },
          },
        ],
      }),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }

    renderAt('/s/maya-studio', undefined, repository)

    expect(
      await screen.findByRole('heading', { name: 'Maya Studio' }),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Arvenilo Network home')).toBeNull()
    expect(screen.queryByText('Where Intelligence Meets Reality.')).toBeNull()
  })
})
