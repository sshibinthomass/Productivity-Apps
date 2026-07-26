import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
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

function buildPublishableDraft() {
  const draft = buildDraft()
  return {
    ...draft,
    blocks: draft.blocks.map((block) =>
      block.type === 'link'
        ? {
            ...block,
            content: {
              ...block.content,
              url: 'https://example.com',
            },
          }
        : block,
    ),
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

  it('customizes the safe theme controls and updates the preview', async () => {
    renderStudio({})
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('tab', { name: 'Design' }))
    fireEvent.change(screen.getByLabelText('Page background'), {
      target: { value: '#112233' },
    })
    fireEvent.change(screen.getByLabelText('Content width'), {
      target: { value: 'wide' },
    })
    fireEvent.change(screen.getByLabelText('Button corners'), {
      target: { value: '28' },
    })

    const preview = document.querySelector('.mini-site--preview')
    expect(preview.style.getPropertyValue('--mini-bg')).toBe('#112233')
    expect(preview.style.getPropertyValue('--mini-content-width')).toBe(
      '52rem',
    )
    expect(preview.style.getPropertyValue('--mini-button-radius')).toBe(
      '28px',
    )
  })

  it('updates settings, changes the public slug, and publishes explicitly', async () => {
    const repository = {
      changeSlug: vi.fn().mockResolvedValue({ slug: 'maya-links' }),
      publishSite: vi
        .fn()
        .mockResolvedValue({ slug: 'maya-links', revision: 0 }),
      unpublishSite: vi.fn().mockResolvedValue({ slug: 'maya-links' }),
    }
    renderStudio(repository, buildPublishableDraft())
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    fireEvent.change(screen.getByLabelText('Site name'), {
      target: { value: 'Maya Links' },
    })
    fireEvent.change(screen.getByLabelText('SEO description'), {
      target: { value: 'Design notes and selected work.' },
    })
    fireEvent.change(screen.getByLabelText('Public slug'), {
      target: { value: 'maya-links' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change address' }))

    await waitFor(() =>
      expect(repository.changeSlug).toHaveBeenCalledWith({
        siteId: 'site-1',
        slug: 'maya-links',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publish site' }))
    await waitFor(() =>
      expect(repository.publishSite).toHaveBeenCalledWith('site-1'),
    )
    expect(screen.getByRole('link', { name: 'View public site' }).href).toContain(
      '/s/maya-links',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish site' }))
    await waitFor(() =>
      expect(repository.unpublishSite).toHaveBeenCalledWith('site-1'),
    )
  })

  it('blocks publishing until visible content passes validation', async () => {
    const repository = { publishSite: vi.fn() }
    renderStudio(repository)
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publish site' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Add both a label and destination.',
    )
    expect(repository.publishSite).not.toHaveBeenCalled()
  })

  it('does not publish when the latest draft cannot be saved', async () => {
    const repository = {
      saveDraft: vi.fn().mockRejectedValue(new Error('Save interrupted')),
      publishSite: vi.fn(),
    }
    renderStudio(repository, buildPublishableDraft())
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }))
    fireEvent.change(screen.getByLabelText('SEO description'), {
      target: { value: 'A newly changed description.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publish site' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Save interrupted',
    )
    expect(repository.publishSite).not.toHaveBeenCalled()
  })

  it('validates and uploads images into the selected block', async () => {
    const repository = {
      uploadDraftAsset: vi.fn().mockResolvedValue({
        storagePath: 'mini-site-drafts/user-1/site-1/asset-1',
        url: 'https://storage.example/avatar.png',
      }),
    }
    renderStudio(repository)
    await screen.findByText('Maya Studio')

    fireEvent.click(screen.getByRole('button', { name: /Edit Your name/ }))
    const invalidFile = new File(['text'], 'notes.txt', {
      type: 'text/plain',
    })
    fireEvent.change(screen.getByLabelText('Upload avatar'), {
      target: { files: [invalidFile] },
    })
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Choose a JPEG, PNG, WebP, or GIF image.',
    )

    const image = new File(['image'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Upload avatar'), {
      target: { files: [image] },
    })
    await waitFor(() =>
      expect(repository.uploadDraftAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'user-1',
          siteId: 'site-1',
          file: image,
        }),
      ),
    )
    expect(screen.getByLabelText('Avatar URL').value).toBe(
      'https://storage.example/avatar.png',
    )
  })
})
