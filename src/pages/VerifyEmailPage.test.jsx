import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import VerifyEmailPage from './VerifyEmailPage.jsx'

vi.mock('../auth/authContext.js', () => ({ useAuth: vi.fn() }))
vi.mock('../auth/TurnstileWidget.jsx', () => ({ default: ({ onVerify }) => <button type="button" onClick={() => onVerify('token')}>Complete security check</button> }))

describe('VerifyEmailPage', () => {
  it('resends verification once and starts a visible cooldown', async () => {
    const resendVerification = vi.fn().mockResolvedValue({ status: true })
    useAuth.mockReturnValue({ authError: null, resendVerification })
    render(<MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'person@example.com' } }]}><VerifyEmailPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => expect(resendVerification).toHaveBeenCalledWith(expect.objectContaining({ email: 'person@example.com', turnstileToken: 'token' })))
    expect(screen.getByRole('button', { name: /Resend available in/ }).disabled).toBe(true)
  })

  it('cleans the resend cooldown timer when the page unmounts', async () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const resendVerification = vi.fn().mockResolvedValue({ status: true })
    useAuth.mockReturnValue({ authError: null, resendVerification })
    const view = render(<MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'person@example.com' } }]}><VerifyEmailPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => expect(resendVerification).toHaveBeenCalled())
    view.unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('does not create a cooldown timer when resend resolves after unmount', async () => {
    let resolveResend
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const resendVerification = vi.fn(() => new Promise((resolve) => { resolveResend = resolve }))
    useAuth.mockReturnValue({ authError: null, resendVerification })
    const view = render(<MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'person@example.com' } }]}><VerifyEmailPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => expect(resendVerification).toHaveBeenCalled())
    setIntervalSpy.mockClear()
    view.unmount()
    resolveResend({ status: true })
    await Promise.resolve()

    expect(setIntervalSpy).not.toHaveBeenCalled()
    setIntervalSpy.mockRestore()
  })
})
