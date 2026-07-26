import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext.js'
import Layout from './Layout.jsx'

const signedOutAuth = {
  user: null,
  isAuthLoading: false,
  authError: null,
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
}

function renderLayout(path) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={signedOutAuth}>
        <Layout>
          <p>Page content</p>
        </Layout>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('identifies every route as part of Arvenilo Network', () => {
    const markup = renderLayout('/')

    expect(markup).toContain('aria-label="Arvenilo Network home"')
    expect(markup).toContain('alt="Arvenilo Network"')
    expect(markup).toContain('Where Intelligence Meets Reality.')
    expect(markup).toContain('Arvenilo Network')
  })

  it('returns nested applications to the network index', () => {
    const markup = renderLayout('/multi-link-opener')

    expect(markup).toContain('href="/"')
    expect(markup).toContain('Network index')
  })
})
