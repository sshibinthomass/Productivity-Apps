import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApplicationShell } from './appBootstrap.jsx'
import { isPublicMiniSiteHost } from './publicHost.js'

describe('application bootstrap host boundary', () => {
  it.each([
    'links.shibinthomas.com',
    'LINKS.SHIBINTHOMAS.COM',
    'links.shibinthomas.com:8787',
  ])('recognizes the exact public host in development forms: %s', (host) => {
    expect(isPublicMiniSiteHost(host)).toBe(true)
  })

  it.each([
    'links.shibinthomas.com.attacker.example',
    'app.shibinthomas.com',
    'links-shibinthomas.com',
  ])('keeps lookalike and application hosts private: %s', (host) => {
    expect(isPublicMiniSiteHost(host)).toBe(false)
  })

  it('recognizes a Worker-rendered public page on a loopback development origin', () => {
    expect(isPublicMiniSiteHost('127.0.0.1:8787', {
      getElementById: (id) => id === 'mini-site-bootstrap' ? {} : null,
    })).toBe(true)
  })

  it('does not mount the auth boundary or management routes on the public host', () => {
    const authMount = vi.fn()
    function AuthBoundary({ children }) {
      authMount()
      return children
    }

    render(
      <ApplicationShell
        host="links.shibinthomas.com"
        RouterComponent={MemoryRouter}
        routerProps={{ initialEntries: ['/login'] }}
        AuthBoundary={AuthBoundary}
      />,
    )

    expect(authMount).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: 'This mini-site is not live.' }),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Email address')).toBeNull()
  })

  it('mounts the authenticated application shell for non-public hosts', () => {
    const authMount = vi.fn()
    function AuthBoundary({ children }) {
      authMount()
      return children
    }
    function AppComponent({ isPublicHost }) {
      return <p>{isPublicHost ? 'public' : 'application'}</p>
    }

    render(
      <ApplicationShell
        host="app.shibinthomas.com"
        RouterComponent={MemoryRouter}
        AuthBoundary={AuthBoundary}
        AppComponent={AppComponent}
      />,
    )

    expect(authMount).toHaveBeenCalledTimes(1)
    expect(screen.getByText('application')).toBeTruthy()
  })
})
