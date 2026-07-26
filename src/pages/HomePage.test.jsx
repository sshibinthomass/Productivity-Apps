import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import HomePage from './HomePage.jsx'

afterEach(cleanup)

describe('HomePage', () => {
  it('presents the Arvenilo Network outcome and honest availability', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Small tools. Connected work.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByText('ARVENILO NETWORK / PRODUCTIVITY SYSTEM'),
    ).toBeTruthy()

    const availability = screen.getByLabelText('Application availability')
    expect(availability.textContent).toContain('4 available now')
    expect(availability.textContent).toContain('3 coming soon')
    expect(screen.getByText('Multi Link Opener')).toBeTruthy()
    expect(screen.getByText('JSON Formatter')).toBeTruthy()
    expect(screen.getByText('Text Comparison')).toBeTruthy()
    expect(screen.getByText('QR Generator')).toBeTruthy()
    expect(screen.getByText('Text Formatter')).toBeTruthy()
    expect(screen.getByText('Focus Timer')).toBeTruthy()
    expect(screen.getByText('Quick Notes')).toBeTruthy()
  })
})
