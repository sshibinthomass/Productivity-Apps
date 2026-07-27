import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../auth/authContext.js'
import { MiniSiteRepositoryProvider } from './data/repositoryContext.jsx'
import MiniSitesDashboardPage from './MiniSitesDashboardPage.jsx'

vi.mock('../../auth/authContext.js', () => ({ useAuth: vi.fn() }))

function renderDashboard(repository) {
  useAuth.mockReturnValue({ user: { uid: 'user-1' } })
  return render(
    <MemoryRouter>
      <MiniSiteRepositoryProvider repository={repository}>
        <MiniSitesDashboardPage />
      </MiniSiteRepositoryProvider>
    </MemoryRouter>,
  )
}

const site = {
  id: 'site-1',
  name: 'Maya Studio',
  slug: 'maya-studio',
  status: 'published',
  draftRevision: 3,
  publishedRevision: 2,
  theme: {
    background: { value: '#e9e5ff', secondary: '#d8f8f2' },
    colors: { text: '#081d21' },
  },
  analytics: { totalViews: 120, totalClicks: 38 },
}

describe('MiniSitesDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows loading, site status, quota, and analytics', async () => {
    const repository = {
      listSites: vi.fn().mockResolvedValue([site]),
      deleteSite: vi.fn(),
    }
    renderDashboard(repository)

    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(await screen.findByRole('heading', { name: 'Maya Studio' }))
      .toBeTruthy()
    expect(screen.getByText('1 of 5 sites used')).toBeTruthy()
    expect(screen.getByText('Changes unpublished')).toBeTruthy()
    expect(screen.getByText('120 views')).toBeTruthy()
    expect(screen.getByText('38 clicks')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Open Maya Studio public site' })
        .getAttribute('href'),
    ).toBe('https://links.shibinthomas.com/maya-studio')
  })

  it('disables new and duplicate actions at the five-site limit', async () => {
    const repository = {
      listSites: vi
        .fn()
        .mockResolvedValue(
          Array.from({ length: 5 }, (_, index) => ({
            ...site,
            id: `site-${index}`,
            slug: `maya-${index}`,
          })),
        ),
      deleteSite: vi.fn(),
    }
    renderDashboard(repository)

    expect(await screen.findByText('5 of 5 sites used')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Create site' })
        .getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      screen.getAllByRole('button', { name: 'Duplicate site' })[0].disabled,
    ).toBe(true)
  })

  it('requires the exact name before deleting and refreshes after success', async () => {
    const repository = {
      listSites: vi
        .fn()
        .mockResolvedValueOnce([site])
        .mockResolvedValueOnce([]),
      deleteSite: vi.fn().mockResolvedValue({ deleted: true }),
    }
    renderDashboard(repository)
    await screen.findByRole('heading', { name: 'Maya Studio' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete site' }))
    const confirmButton = screen.getByRole('button', {
      name: 'Delete permanently',
    })
    expect(confirmButton.disabled).toBe(true)
    const confirmationInput = screen.getByLabelText(
      'Type Maya Studio to confirm',
    )
    fireEvent.change(confirmationInput, {
      target: { value: 'Maya Studio' },
    })
    confirmButton.focus()
    fireEvent.keyDown(confirmButton, { key: 'Tab' })
    expect(document.activeElement).toBe(confirmationInput)
    fireEvent.keyDown(confirmationInput, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirmButton)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(repository.deleteSite).toHaveBeenCalledWith({
        siteId: 'site-1',
        confirmationName: 'Maya Studio',
      })
      expect(screen.getByText('No sites yet')).toBeTruthy()
    })
  })
})
