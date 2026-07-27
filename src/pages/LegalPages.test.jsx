import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PrivacyPage from './PrivacyPage.jsx'
import TermsPage from './TermsPage.jsx'

describe('registration legal pages', () => {
  it('publishes the effective version and owner-controlled contact link', () => {
    render(<MemoryRouter><TermsPage /><PrivacyPage /></MemoryRouter>)
    expect(screen.getAllByText(/Effective 2026-07-26/)).toHaveLength(2)
    const contacts = screen.getAllByRole('link', { name: 'site owner’s published contact channel' })
    expect(contacts).toHaveLength(2)
    expect(contacts[0].getAttribute('href')).toBe('https://shibinthomas.com/')
  })

  it('preserves registration intent in location state when returning from terms', () => {
    function LoginState() { return <output>{useLocation().state?.authMode || 'none'}</output> }
    render(<MemoryRouter initialEntries={[{ pathname: '/terms', state: { authMode: 'register' } }]}><Routes><Route path="/terms" element={<TermsPage />} /><Route path="/login" element={<LoginState />} /></Routes></MemoryRouter>)
    const back = screen.getByRole('link', { name: 'Back to account creation' })
    fireEvent.click(back)
    expect(screen.getByText('register')).toBeTruthy()
  })
})
