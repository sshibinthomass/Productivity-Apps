import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authContext.js'
import AccountSecurityPage from './AccountSecurityPage.jsx'

vi.mock('../auth/authContext.js', () => ({ useAuth: vi.fn() }))

describe('AccountSecurityPage', () => {
  it('requires the current password and confirms other sessions are revoked', async () => {
    const changePassword = vi.fn().mockResolvedValue({ status: true })
    useAuth.mockReturnValue({ user: { uid: 'user-1' }, isAuthLoading: false, authError: null, changePassword })
    render(<MemoryRouter><Routes><Route path="/" element={<AccountSecurityPage />} /></Routes></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-password' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'long-password' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'old-password', newPassword: 'long-password' }))
    expect(screen.getByRole('status').textContent).toContain('Other signed-in sessions have been revoked')
  })
})
