import { afterEach, describe, expect, it, vi } from 'vitest'

const render = vi.fn()

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render }),
}))
vi.mock('./appBootstrap.jsx', () => ({
  ApplicationShell: () => null,
}))
vi.mock('./theme/theme.js', () => ({
  applyTheme: vi.fn(),
  readStoredTheme: vi.fn(() => 'light'),
}))

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.resetModules()
  render.mockClear()
})

describe('application entry routing', () => {
  it('restores a safe GitHub Pages route before the router renders', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    window.history.replaceState(
      null,
      '',
      '/?route=%2Fmini-sites%2Fnew%3Ftemplate%3Dblank%23create',
    )

    await import('./main.jsx')

    expect(window.location.pathname).toBe('/mini-sites/new')
    expect(window.location.search).toBe('?template=blank')
    expect(window.location.hash).toBe('#create')
    expect(render).toHaveBeenCalledTimes(1)
  })
})
