import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TurnstileWidget from './TurnstileWidget.jsx'

afterEach(() => {
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((script) => script.remove())
  delete window.turnstile
})

describe('TurnstileWidget', () => {
  it('loads the explicit Turnstile API and clears a token on expiration', async () => {
    const renderWidget = vi.fn().mockReturnValue('widget-1')
    const remove = vi.fn()
    window.turnstile = { render: renderWidget, remove }
    const onVerify = vi.fn()
    const view = render(<TurnstileWidget onVerify={onVerify} />)

    await waitFor(() => expect(renderWidget).toHaveBeenCalled())
    const options = renderWidget.mock.calls[0][1]
    options.callback('verified-token')
    options['expired-callback']()
    expect(onVerify).toHaveBeenNthCalledWith(1, 'verified-token')
    expect(onVerify).toHaveBeenLastCalledWith(null)
    view.unmount()
    expect(remove).toHaveBeenCalledWith('widget-1')
  })
})
