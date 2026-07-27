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
})
