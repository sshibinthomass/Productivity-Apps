import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MiniSiteRepositoryProvider } from './data/repositoryContext.jsx'
import PublicMiniSitePage from './PublicMiniSitePage.jsx'
import { readMiniSiteBootstrap } from './publicBootstrap.js'
import { renderPublicPage } from '../../../worker/src/public/renderPage.js'

function renderPublic(repository, slug = 'maya-studio', route = `/s/${slug}`) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MiniSiteRepositoryProvider repository={repository}>
        <Routes>
          <Route path="/s/:slug" element={<PublicMiniSitePage />} />
          <Route path="/:slug" element={<PublicMiniSitePage />} />
        </Routes>
      </MiniSiteRepositoryProvider>
    </MemoryRouter>,
  )
}

const bootstrapSite = {
  schemaVersion: 1,
  slug: 'maya-studio',
  revision: 3,
  theme: {},
  seo: { title: 'Maya from bootstrap', description: '' },
  blocks: [
    {
      id: 'profile',
      type: 'profile',
      visible: true,
      content: {
        avatarUrl: '',
        displayName: 'Maya from bootstrap',
        bio: 'Selected work',
        alt: '',
      },
    },
    {
      id: 'portfolio',
      type: 'link',
      visible: true,
      content: {
        label: 'Portfolio',
        url: 'https://example.com/work',
        supportingText: '',
        icon: '',
      },
    },
  ],
}

function injectBootstrap(site = bootstrapSite) {
  const element = document.createElement('template')
  element.id = 'mini-site-bootstrap'
  element.content.textContent = JSON.stringify(site)
  document.body.append(element)
}

function setBootstrapText(value) {
  document.getElementById('mini-site-bootstrap').content.textContent = value
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
  beforeEach(() => {
    document.getElementById('mini-site-bootstrap')?.remove()
    sessionStorage.clear()
  })

  afterEach(() => {
    document.getElementById('mini-site-bootstrap')?.remove()
    vi.restoreAllMocks()
  })

  it('renders the public-host bootstrap without a public JSON round trip', async () => {
    injectBootstrap()
    const repository = {
      getPublished: vi.fn(),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }

    renderPublic(repository, 'maya-studio', '/maya-studio')

    expect(
      await screen.findByRole('heading', { name: 'Maya from bootstrap' }),
    ).toBeTruthy()
    expect(repository.getPublished).not.toHaveBeenCalled()
    await waitFor(() => expect(repository.recordEvent).toHaveBeenCalledTimes(1))
  })

  it('reads the template emitted by the Worker renderer', () => {
    const html = renderPublicPage({
      document: '<!doctype html><html><head></head><body></body></html>',
      site: bootstrapSite,
      origin: 'https://links.shibinthomas.com',
    })
    const rendered = new DOMParser().parseFromString(html, 'text/html')

    expect(readMiniSiteBootstrap(rendered)?.slug).toBe('maya-studio')
    expect(rendered.querySelector('script#mini-site-bootstrap')).toBeNull()
  })

  it('uses public JSON when the document has no valid bootstrap snapshot', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue(publishedSite),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }

    renderPublic(repository)

    expect(await screen.findByRole('heading', { name: 'Maya Studio' })).toBeTruthy()
    expect(repository.getPublished).toHaveBeenCalledWith('maya-studio')
  })

  it('rejects malformed or incompatible bootstrap data', () => {
    injectBootstrap({ schemaVersion: 2, slug: 'maya-studio', blocks: [] })
    expect(readMiniSiteBootstrap(document)).toBeNull()

    setBootstrapText(JSON.stringify({
      ...bootstrapSite,
      theme: null,
    }))
    expect(readMiniSiteBootstrap(document)).toBeNull()

    setBootstrapText('{not json')
    expect(readMiniSiteBootstrap(document)).toBeNull()
  })

  it.each([
    ['an object block ID', { id: { unsafe: true } }],
    ['a null profile content object', { content: null }],
    ['an invalid nested profile field', { content: { displayName: ['Maya'] } }],
  ])('rejects bootstrap snapshots with %s', (_label, patch) => {
    injectBootstrap({
      ...bootstrapSite,
      blocks: [{ ...bootstrapSite.blocks[0], ...patch }],
    })

    expect(readMiniSiteBootstrap(document)).toBeNull()
  })

  it('falls back to public JSON when a recognized bootstrap block is malformed', async () => {
    injectBootstrap({
      ...bootstrapSite,
      blocks: [{ ...bootstrapSite.blocks[0], id: { private: 'id' } }],
    })
    const repository = {
      getPublished: vi.fn().mockResolvedValue(publishedSite),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }

    renderPublic(repository, 'maya-studio', '/maya-studio')

    expect(await screen.findByRole('heading', { name: 'Maya Studio' })).toBeTruthy()
    expect(repository.getPublished).toHaveBeenCalledWith('maya-studio')
  })

  it('projects only public theme fields from a valid bootstrap snapshot', () => {
    injectBootstrap({
      ...bootstrapSite,
      theme: {
        colors: { text: '#112233', private: 'do-not-render' },
        internalThemeName: 'private',
      },
    })

    const site = readMiniSiteBootstrap(document)

    expect(site?.theme.colors.text).toBe('#112233')
    expect(site?.theme.colors).not.toHaveProperty('private')
    expect(site?.theme).not.toHaveProperty('internalThemeName')
  })

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

  it('records a view only once for the browser session', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue(publishedSite),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }

    const first = renderPublic(repository)
    await screen.findByRole('heading', { name: 'Maya Studio' })
    await waitFor(() => expect(repository.recordEvent).toHaveBeenCalledTimes(1))
    first.unmount()

    renderPublic(repository)
    await screen.findByRole('heading', { name: 'Maya Studio' })
    await waitFor(() => expect(repository.getPublished).toHaveBeenCalledTimes(2))

    expect(repository.recordEvent).toHaveBeenCalledTimes(1)
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

  it('reports click analytics without preventing a visitor from following a link', async () => {
    const repository = {
      getPublished: vi.fn().mockResolvedValue(bootstrapSite),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }
    renderPublic(repository)

    const link = await screen.findByRole('link', { name: /Portfolio/ })
    const clicked = fireEvent.click(link)

    expect(clicked).toBe(true)
    await waitFor(() =>
      expect(repository.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'link_click', blockId: 'portfolio' }),
      ),
    )
  })

  it('uses bounded independent receipt IDs for same-millisecond long-block clicks', async () => {
    const blockId = 'link-'.padEnd(128, 'x')
    const repository = {
      getPublished: vi.fn().mockResolvedValue({
        ...bootstrapSite,
        blocks: [
          bootstrapSite.blocks[0],
          { ...bootstrapSite.blocks[1], id: blockId },
        ],
      }),
      recordEvent: vi.fn().mockResolvedValue({ recorded: true }),
    }
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    renderPublic(repository)
    const link = await screen.findByRole('link', { name: /Portfolio/ })
    fireEvent.click(link)
    fireEvent.click(link)

    await waitFor(() =>
      expect(
        repository.recordEvent.mock.calls.filter(
          ([event]) => event.type === 'link_click',
        ),
      ).toHaveLength(2),
    )
    const events = repository.recordEvent.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'link_click')

    expect(new Set(events.map((event) => event.eventId)).size).toBe(2)
    for (const event of events) {
      expect(event.eventId).not.toContain(blockId)
      expect(event.eventId.length).toBeGreaterThanOrEqual(8)
      expect(event.eventId.length).toBeLessThanOrEqual(160)
    }
  })
})
