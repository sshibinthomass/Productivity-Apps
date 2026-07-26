import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../../auth/authContext.js'
import { MiniSiteRepositoryProvider } from '../data/repositoryContext.jsx'
import { createDraft } from '../model/miniSiteModel.js'
import MiniSiteStudioPage from './MiniSiteStudioPage.jsx'

function buildDraft() {
  return {
    id: 'site-1',
    ...createDraft({
      name: 'Maya Studio',
      slug: 'maya-studio',
      templateId: 'creator',
    }),
  }
}

function renderStudio(repository, draft = buildDraft()) {
  repository.getDraft ??= vi.fn().mockResolvedValue(draft)
  repository.saveDraft ??= vi.fn().mockImplementation(
    (_uid, _siteId, nextDraft, revision) =>
      Promise.resolve({ ...nextDraft, draftRevision: revision + 1 }),
  )

  return render(
    <MemoryRouter initialEntries={['/mini-sites/site-1/edit']}>
      <AuthContext.Provider
        value={{ user: { uid: 'user-1' }, isAuthLoading: false }}
      >
        <MiniSiteRepositoryProvider repository={repository}>
          <Routes>
            <Route
              path="/mini-sites/:siteId/edit"
              element={<MiniSiteStudioPage />}
            />
          </Routes>
        </MiniSiteRepositoryProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('MiniSiteStudioPage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the draft into the content editor and live preview', async () => {
    renderStudio({})

    expect(screen.getByText('Opening studio…')).toBeTruthy()
    expect(await screen.findByText('Maya Studio')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Content' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Live preview' })).toBeTruthy()
    expect(screen.getAllByText('Your name').length).toBeGreaterThan(0)
  })

  it('edits blocks, adds every block type, and supports undo and redo', async () => {
    renderStudio({})
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('button', { name: /Edit Your name/ }))
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Maya Rivera' },
    })
    expect(screen.getAllByText('Maya Rivera').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getAllByText('Your name').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getAllByText('Maya Rivera').length).toBeGreaterThan(0)

    for (const label of [
      'Add profile',
      'Add link',
      'Add heading',
      'Add paragraph',
      'Add image',
      'Add socials',
      'Add divider',
      'Add spacer',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
      fireEvent.click(screen.getByRole('button', { name: label }))
    }

    expect(screen.getAllByTestId('studio-block')).toHaveLength(11)
  })

  it('moves, hides, duplicates, and deletes a selected block', async () => {
    renderStudio({})
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('button', { name: /Edit My latest work/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Move block down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide block' }))
    expect(screen.getByRole('button', { name: 'Show block' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate block' }))
    expect(screen.getAllByText('My latest work')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }))
    expect(screen.getAllByText('My latest work')).toHaveLength(1)
  })

  it('shows save state and retries autosave failures', async () => {
    const repository = {
      getDraft: vi.fn().mockResolvedValue(buildDraft()),
      saveDraft: vi
        .fn()
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce({ ...buildDraft(), draftRevision: 1 }),
    }
    renderStudio(repository)
    await screen.findByText('Maya Studio')
    vi.useFakeTimers()

    fireEvent.click(screen.getByRole('button', { name: /Edit Your name/ }))
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'New name' },
    })
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(700))
    expect(screen.getByText('Save failed')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry save' }))
    })
    expect(screen.getByText('Saved')).toBeTruthy()
  })

  it('keeps loading errors recoverable and offers mobile edit/preview tabs', async () => {
    const repository = {
      getDraft: vi
        .fn()
        .mockRejectedValueOnce(new Error('No network'))
        .mockResolvedValueOnce(buildDraft()),
    }
    renderStudio(repository)

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No network',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(
      screen.getByRole('tab', { name: 'Preview' }).getAttribute(
        'aria-selected',
      ),
    ).toBe('true')
  })
})
