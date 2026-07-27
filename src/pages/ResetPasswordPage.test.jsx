import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

  it('handles Better Auth invalid-token callbacks before accepting a new password', () => {
    useAuth.mockReturnValue({ authError: null, resetPassword: vi.fn() })
    render(<MemoryRouter initialEntries={['/reset-password?token=opaque&error=INVALID_TOKEN']}><ResetPasswordPage /></MemoryRouter>)

    expect(screen.getByRole('alert').textContent).toContain('expired or invalid')
    expect(screen.getByRole('link', { name: 'Request a new reset link' }).getAttribute('href')).toBe('/forgot-password')
    expect(screen.getByRole('button', { name: 'Set new password' }).disabled).toBe(true)
  })

  it('replaces the reset URL with login after a successful Better Auth reset', async () => {
    useAuth.mockReturnValue({ authError: null, resetPassword: vi.fn().mockResolvedValue({ status: true }) })
    render(<MemoryRouter initialEntries={['/reset-password?token=opaque']}><Routes><Route path="/reset-password" element={<ResetPasswordPage />} /><Route path="/login" element={<p>Login destination</p>} /></Routes></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'long-password' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    await waitFor(() => expect(screen.getByText('Login destination')).toBeTruthy())
  })

  it('focuses the new password when it is too short', () => {
    useAuth.mockReturnValue({ authError: null, resetPassword: vi.fn() })
    render(<MemoryRouter initialEntries={['/reset-password?token=opaque']}><ResetPasswordPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(document.activeElement).toBe(screen.getByLabelText('New password'))
  })
})
