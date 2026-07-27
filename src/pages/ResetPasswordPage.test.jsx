import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import ResetPasswordPage from './ResetPasswordPage.jsx'

vi.mock('../auth/authContext.js', () => ({ useAuth: vi.fn() }))

describe('ResetPasswordPage', () => {
  it('shows an actionable expired reset-token error', async () => {
    const resetPassword = vi.fn().mockResolvedValue(null)
    useAuth.mockReturnValue({ authError: 'This reset link has expired. Request a new link.', resetPassword })
    render(<MemoryRouter initialEntries={['/reset-password?token=opaque']}><ResetPasswordPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'long-password' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('expired'))
  })
})
