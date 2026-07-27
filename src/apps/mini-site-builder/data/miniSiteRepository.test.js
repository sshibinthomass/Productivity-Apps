import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../../api/apiClient.js'
import { createDraft } from '../model/miniSiteModel.js'
import { createMiniSiteRepository } from './miniSiteRepository.js'

function createApi() {
  return {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), upload: vi.fn(),
  }
}

afterEach(() => {
  document.getElementById('mini-site-bootstrap')?.remove()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('mini-site repository HTTP contracts', () => {
  it('keeps the configured Worker URL for the separate Vite management shell', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8787')
    vi.stubEnv('VITE_PUBLIC_SITE_BASE_URL', 'http://127.0.0.1:8787')
    vi.stubGlobal('location', { hostname: 'localhost', origin: 'http://localhost:5173' })
    vi.resetModules()

    const { publicSiteBaseUrl } = await import('./miniSiteRepository.js')

    expect(publicSiteBaseUrl).toBe('http://127.0.0.1:8787')
  })

  it('uses the current Worker origin only for a loopback public bootstrap shell', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8787')
    vi.stubEnv('VITE_PUBLIC_SITE_BASE_URL', 'https://links.shibinthomas.com')
    vi.stubGlobal('location', { hostname: '127.0.0.1', origin: 'http://127.0.0.1:8787' })
    const marker = document.createElement('template')
    marker.id = 'mini-site-bootstrap'
    document.body.append(marker)
    vi.resetModules()

    const { publicSiteBaseUrl } = await import('./miniSiteRepository.js')

    expect(publicSiteBaseUrl).toBe('http://127.0.0.1:8787')
  })

  it('uses management endpoints, normalizes drafts, and ignores legacy uid arguments', async () => {
    const api = createApi()
    const source = { siteId: 'site-1', ...createDraft({ name: 'Maya Studio', slug: 'maya-studio', templateId: 'creator' }) }
    api.get.mockResolvedValueOnce({ sites: [source] }).mockResolvedValueOnce({ site: source })
    api.put.mockResolvedValue({ site: { ...source, name: ' Updated ', draftRevision: 3 } })
    const repository = createMiniSiteRepository(api)

    await expect(repository.listSites('ignored-user-id')).resolves.toMatchObject([{ id: 'site-1', name: 'Maya Studio' }])
    await expect(repository.getDraft('ignored-user-id', 'site-1')).resolves.toMatchObject({ id: 'site-1', name: 'Maya Studio' })
    await expect(repository.saveDraft('ignored-user-id', 'site-1', { ...source, name: ' Updated ' }, 2)).resolves.toMatchObject({ id: 'site-1', name: 'Updated', draftRevision: 3 })
    expect(api.get).toHaveBeenNthCalledWith(1, '/v1/sites')
    expect(api.get).toHaveBeenNthCalledWith(2, '/v1/sites/site-1')
    expect(api.put).toHaveBeenCalledWith('/v1/sites/site-1', expect.objectContaining({ expectedRevision: 2, draft: expect.objectContaining({ name: 'Updated' }) }))
  })

  it('uses exact lifecycle, analytics, and asset endpoint contracts', async () => {
    const api = createApi()
    api.post.mockResolvedValue({ site: { siteId: 'new-site' } })
    api.put.mockResolvedValue({ site: { slug: 'maya-renamed' } })
    api.delete.mockResolvedValue({ deleted: true })
    api.upload.mockResolvedValue({ asset: { assetId: 'asset-1', storagePath: 'drafts/site-1/asset-1', url: 'https://api.example/asset' } })
    api.get.mockResolvedValue({ analytics: { summary: { totalViews: 1 }, days: [], linkClicks: {} } })
    const repository = createMiniSiteRepository(api)

    await expect(repository.createSite({ name: 'New', slug: 'new-site', templateId: 'blank' })).resolves.toMatchObject({
      id: 'new-site',
      siteId: 'new-site',
    })
    await repository.duplicateSite({ sourceSiteId: 'site-1', name: 'Copy', slug: 'copy', templateId: 'blank' })
    await repository.changeSlug({ siteId: 'site-1', slug: 'maya-renamed' })
    await repository.publishSite('site-1')
    await repository.unpublishSite('site-1')
    await repository.deleteSite({ siteId: 'site-1', confirmationName: 'Maya' })
    await repository.uploadDraftAsset({ uid: 'ignored-user-id', siteId: 'site-1', assetId: 'ignored-asset-id', file: new File(['image'], 'image.png', { type: 'image/png' }) })
    await repository.getAnalytics('ignored-user-id', 'site-1')

    expect(api.post).toHaveBeenNthCalledWith(1, '/v1/sites', { name: 'New', slug: 'new-site', templateId: 'blank' })
    expect(api.post).toHaveBeenNthCalledWith(2, '/v1/sites/site-1/duplicate', { name: 'Copy', slug: 'copy', templateId: 'blank' })
    expect(api.put).toHaveBeenCalledWith('/v1/sites/site-1/slug', { slug: 'maya-renamed' })
    expect(api.post).toHaveBeenCalledWith('/v1/sites/site-1/publish', {})
    expect(api.post).toHaveBeenCalledWith('/v1/sites/site-1/unpublish', {})
    expect(api.delete).toHaveBeenCalledWith('/v1/sites/site-1', { confirmationName: 'Maya' })
    expect(api.upload).toHaveBeenCalledWith('/v1/sites/site-1/assets', expect.any(FormData))
    expect(api.get).toHaveBeenCalledWith('/v1/sites/site-1/analytics')
  })

  it('uses the public client for snapshots and fire-and-forget analytics', async () => {
    const management = createApi()
    const publicApi = createApi()
    publicApi.get.mockResolvedValue({ site: { slug: 'maya', blocks: [], theme: {}, seo: {} } })
    publicApi.post.mockRejectedValue(new Error('offline'))
    const repository = createMiniSiteRepository(management, { publicApi })

    await expect(repository.getPublished('maya')).resolves.toMatchObject({ slug: 'maya' })
    await expect(repository.recordEvent({ slug: 'maya', type: 'view', eventId: 'event-1' })).resolves.toBeNull()
    expect(publicApi.get).toHaveBeenCalledWith('/v1/public/sites/maya')
    expect(publicApi.post).toHaveBeenCalledWith('/v1/public/sites/maya/events', { type: 'view', eventId: 'event-1' })
  })

  it('keeps an unpublished public site as a not-found result for the page', async () => {
    const management = createApi()
    const publicApi = createApi()
    publicApi.get.mockRejectedValue(Object.assign(new Error('Not found.'), { code: 'not_found', status: 404 }))
    const repository = createMiniSiteRepository(management, { publicApi })

    await expect(repository.getPublished('unpublished')).resolves.toBeNull()
  })

  it('keeps a plain-text Worker 404 as a not-found public result', async () => {
    const publicApi = createApiClient({
      baseUrl: 'https://links.shibinthomas.com',
      fetchImpl: vi.fn().mockResolvedValue(new Response('Not found.', { status: 404 })),
    })
    const repository = createMiniSiteRepository(createApi(), { publicApi })

    await expect(repository.getPublished('unpublished')).resolves.toBeNull()
  })
})
