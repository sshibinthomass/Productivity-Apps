import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import ForgotPasswordPage from './ForgotPasswordPage.jsx'

vi.mock('../auth/authContext.js', () => ({ useAuth: vi.fn() }))
vi.mock('../auth/TurnstileWidget.jsx', () => ({ default: ({ onVerify }) => <button type="button" onClick={() => onVerify('token')}>Complete security check</button> }))

describe('ForgotPasswordPage', () => {
  it('always gives the generic reset acknowledgement', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({ status: true })
    useAuth.mockReturnValue({ authError: null, requestPasswordReset })
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete security check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('If an account exists for that email, a reset link is on its way.'))
  })
})
