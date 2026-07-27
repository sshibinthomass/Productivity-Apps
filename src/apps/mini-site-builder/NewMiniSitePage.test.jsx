import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { MiniSiteRepositoryProvider } from './data/repositoryContext.jsx'
import NewMiniSitePage from './NewMiniSitePage.jsx'

function renderNew(repository) {
  return render(
    <MemoryRouter initialEntries={['/mini-sites/new']}>
      <MiniSiteRepositoryProvider repository={repository}>
        <Routes>
          <Route path="/mini-sites/new" element={<NewMiniSitePage />} />
          <Route
            path="/mini-sites/:siteId/edit"
            element={<p>Editor opened</p>}
          />
        </Routes>
      </MiniSiteRepositoryProvider>
    </MemoryRouter>,
  )
}

describe('NewMiniSitePage', () => {
  it('offers four templates and a blank canvas', () => {
    renderNew({ createSite: vi.fn() })

    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: /Creator/ }).checked).toBe(true)
    expect(
      screen.getByRole('radio', { name: /Start from scratch/ }),
    ).toBeTruthy()
  })

  it('suggests a slug and opens the created editor', async () => {
    const repository = {
      createSite: vi.fn().mockResolvedValue({
        siteId: 'site-new',
        slug: 'maya-studio',
      }),
    }
    renderNew(repository)

    fireEvent.change(screen.getByLabelText('Site name'), {
      target: { value: 'Maya Studio' },
    })
    expect(screen.getByLabelText('Public slug').value).toBe('maya-studio')
    fireEvent.click(screen.getByRole('radio', { name: /Portfolio/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create mini-site' }))

    await waitFor(() => {
      expect(repository.createSite).toHaveBeenCalledWith({
        name: 'Maya Studio',
        slug: 'maya-studio',
        templateId: 'portfolio',
      })
      expect(screen.getByText('Editor opened')).toBeTruthy()
    })
  })

  it('keeps backend quota and slug errors actionable', async () => {
    const error = new Error('That public slug is already in use.')
    error.code = 'already-exists'
    const repository = {
      createSite: vi.fn().mockRejectedValue(error),
    }
    renderNew(repository)

    fireEvent.change(screen.getByLabelText('Site name'), {
      target: { value: 'Maya Studio' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create mini-site' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'already in use',
    )
  })
})
