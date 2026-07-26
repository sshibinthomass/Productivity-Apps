import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { appRegistry } from '../config/appRegistry.jsx'
import AppCard from './AppCard.jsx'

afterEach(cleanup)

function renderCard(app) {
  return render(
    <MemoryRouter>
      <AppCard app={app} />
    </MemoryRouter>,
  )
}

describe('AppCard', () => {
  it('links available applications to their working route', () => {
    renderCard(appRegistry[0])

    const link = screen.getByRole('link', { name: 'Open Multi Link Opener' })
    expect(link.getAttribute('href')).toBe('/multi-link-opener')
    expect(screen.getByText('AVAILABLE NOW')).toBeTruthy()
    expect(screen.getByText('Open application')).toBeTruthy()
  })

  it('describes coming-soon applications without presenting an action', () => {
    const comingSoonApp = appRegistry.find(
      (app) => app.status === 'coming-soon',
    )
    const { container } = renderCard(comingSoonApp)

    expect(container.querySelector('article')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('COMING SOON')).toBeTruthy()
    expect(screen.getByText('Announced for the network')).toBeTruthy()
  })
})
