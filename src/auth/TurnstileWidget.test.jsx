import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TurnstileWidget from './TurnstileWidget.jsx'

function installTurnstile(overrides = {}) {
  const api = {
    render: vi.fn().mockReturnValue('widget-1'),
    remove: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
  window.turnstile = api
  return api
}

const originalInnerWidth = window.innerWidth

afterEach(() => {
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((script) => script.remove())
  delete window.turnstile
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
})

describe('TurnstileWidget', () => {
  it('reports a missing site key instead of rendering an unusable challenge', () => {
    installTurnstile()
    render(<TurnstileWidget onVerify={vi.fn()} />)

    expect(screen.getByRole('alert').textContent).toContain('not configured')
    expect(screen.queryByRole('button', { name: 'Retry security check' })).toBeNull()
  })

  it('loads the explicit API, clears expired or errored tokens, resets, and removes its widget', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    const api = installTurnstile()
    const onVerify = vi.fn()
    const view = render(<TurnstileWidget onVerify={onVerify} resetKey={0} />)

    await waitFor(() => expect(api.render).toHaveBeenCalled())
    const options = api.render.mock.calls[0][1]
    options.callback('verified-token')
    options['expired-callback']()
    expect(onVerify).toHaveBeenNthCalledWith(1, 'verified-token')
    expect(onVerify).toHaveBeenLastCalledWith(null)
    onVerify.mockClear()
    options['error-callback']()
    expect(onVerify).toHaveBeenCalledWith(null)
    view.rerender(<TurnstileWidget onVerify={onVerify} resetKey={1} />)
    expect(api.reset).toHaveBeenCalledWith('widget-1')
    view.unmount()
    expect(api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('uses compact Turnstile at the 320px breakpoint', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    const api = installTurnstile()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    render(<TurnstileWidget onVerify={vi.fn()} />)

    await waitFor(() => expect(api.render).toHaveBeenCalled())
    expect(api.render.mock.calls[0][1].size).toBe('compact')
  })

  it('shows a retry action after the API script fails and recreates the script', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    render(<TurnstileWidget onVerify={vi.fn()} />)
    const failedScript = document.getElementById('arvenilo-turnstile-script')
    fireEvent.error(failedScript)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not load'))
    fireEvent.click(screen.getByRole('button', { name: 'Retry security check' }))
    const retryScript = document.getElementById('arvenilo-turnstile-script')
    expect(retryScript).toBeTruthy()
    expect(retryScript).not.toBe(failedScript)
    const api = installTurnstile()
    fireEvent.load(retryScript)
    await waitFor(() => expect(api.render).toHaveBeenCalled())
  })

  it('offers retry when Turnstile rendering throws', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    const api = installTurnstile({ render: vi.fn(() => { throw new Error('render failed') }) })
    render(<TurnstileWidget onVerify={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry security check' })).toBeTruthy())
    api.render.mockImplementation(() => 'widget-2')
    fireEvent.click(screen.getByRole('button', { name: 'Retry security check' }))
    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(2))
  })
})
