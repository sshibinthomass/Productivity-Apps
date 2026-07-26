import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MiniSiteRepositoryProvider } from './data/repositoryContext.jsx'
import PublicMiniSitePage from './PublicMiniSitePage.jsx'

function renderPublic(repository, slug = 'maya-studio') {
  return render(
    <MemoryRouter initialEntries={[`/s/${slug}`]}>
      <MiniSiteRepositoryProvider repository={repository}>
        <Routes>
          <Route path="/s/:slug" element={<PublicMiniSitePage />} />
        </Routes>
      </MiniSiteRepositoryProvider>
    </MemoryRouter>,
  )
}

const publishedSite = {
  slug: 'maya-studio',
  theme: {},
  seo: { title: 'Maya Studio', description: '' },
  blocks: [
    {
      id: 'profile',
      type: 'profile',
      visible: true,
      content: {
        avatarUrl: '',
        displayName: 'Maya Studio',
        bio: 'Selected work',
        alt: '',
      },
    },
  ],
}

describe('PublicMiniSitePage', () => {
  it('loads an exact published slug and records one view', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue(publishedSite),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }

    renderPublic(repository)

    expect(screen.getByRole('status').textContent).toContain('Loading')
    await screen.findByRole('heading', { name: 'Maya Studio' })
    await waitFor(() => {
      expect(repository.recordEvent).toHaveBeenCalledTimes(1)
      expect(repository.recordEvent).toHaveBeenCalledWith({
        slug: 'maya-studio',
        type: 'view',
        eventId: expect.any(String),
      })
    })
  })

  it('shows a public not-found state for an unpublished slug', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue(null),
      recordEvent: vi.fn(),
    }

    renderPublic(repository, 'missing-site')

    expect(
      await screen.findByRole('heading', { name: 'This mini-site is not live.' }),
    ).toBeTruthy()
    expect(repository.recordEvent).not.toHaveBeenCalled()
  })

  it('keeps rendering when analytics reporting fails', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue(publishedSite),
      recordEvent: vi.fn().mockRejectedValue(new Error('offline')),
    }

    renderPublic(repository)

    expect(
      await screen.findByRole('heading', { name: 'Maya Studio' }),
    ).toBeTruthy()
  })
})
