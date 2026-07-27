import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFoundPage from './NotFoundPage.jsx'

describe('NotFoundPage', () => {
  it('returns an unknown application to the network index', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'This application is outside the network.',
      }),
    ).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Return to network' })
    expect(link.getAttribute('href')).toBe('/')
  })
})
