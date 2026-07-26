import { describe, expect, it } from 'vitest'
import { createDraft } from '../model/miniSiteModel.js'
import { createMiniSiteRepository } from './miniSiteRepository.js'

function createFakeSdk() {
  const calls = []
  const documents = new Map([
    [
      'users/user-1/sites/site-1',
      {
        ...createDraft({
          name: 'Maya Studio',
          slug: 'maya-studio',
          templateId: 'creator',
        }),
        draftRevision: 2,
      },
    ],
    [
      'publishedMiniSites/maya-studio',
      {
        slug: 'maya-studio',
        blocks: [],
        theme: {},
        seo: {},
      },
    ],
  ])

  return {
    calls,
    documents,
    doc: (_db, ...segments) => segments.join('/'),
    collection: (_db, ...segments) => segments.join('/'),
    orderBy: (field, direction) => ({ field, direction }),
    limit: (count) => ({ count }),
    query: (path, ...constraints) => ({ path, constraints }),
    getDoc: async (path) => ({
      id: path.split('/').at(-1),
      exists: () => documents.has(path),
      data: () => documents.get(path),
    }),
    getDocs: async (queryValue) => {
      calls.push(['getDocs', queryValue])
      if (queryValue.path.endsWith('analyticsDays')) {
        return {
          docs: [
            {
              id: '2026-07-26',
              data: () => ({ views: 4, clicks: 2 }),
            },
          ],
        }
      }
      return {
        docs: [
          {
            id: 'site-1',
            data: () => documents.get('users/user-1/sites/site-1'),
          },
        ],
      }
    },
    runTransaction: async (_db, operation) =>
      operation({
        get: async (path) => ({
          exists: () => documents.has(path),
          data: () => documents.get(path),
        }),
        update: (path, patch) => {
          calls.push(['update', path, patch])
          documents.set(path, { ...documents.get(path), ...patch })
        },
      }),
    httpsCallable: (_functions, name) => async (payload) => {
      calls.push(['callable', name, payload])
      return { data: { siteId: 'site-new', slug: payload.slug } }
    },
    ref: (_storage, path) => path,
    uploadBytes: async (path, file, metadata) => {
      calls.push(['upload', path, file, metadata])
      return { ref: path }
    },
    getDownloadURL: async (path) => `https://storage.example/${path}`,
  }
}

describe('mini-site repository', () => {
  it('loads owner drafts and exact public snapshots', async () => {
    const sdk = createFakeSdk()
    const repository = createMiniSiteRepository(
      { db: {}, storage: {}, functions: {} },
      sdk,
    )

    await expect(repository.listSites('user-1')).resolves.toMatchObject([
      { id: 'site-1', name: 'Maya Studio' },
    ])
    await expect(repository.getDraft('user-1', 'site-1')).resolves.toMatchObject(
      { name: 'Maya Studio', draftRevision: 2 },
    )
    await expect(repository.getPublished('maya-studio')).resolves.toMatchObject(
      { slug: 'maya-studio' },
    )
  })

  it('saves only when the expected revision matches', async () => {
    const sdk = createFakeSdk()
    const repository = createMiniSiteRepository(
      { db: {}, storage: {}, functions: {} },
      sdk,
    )
    const draft = await repository.getDraft('user-1', 'site-1')
    draft.name = 'Updated'

    await expect(
      repository.saveDraft('user-1', 'site-1', draft, 2),
    ).resolves.toMatchObject({ draftRevision: 3 })
    await expect(
      repository.saveDraft('user-1', 'site-1', draft, 2),
    ).rejects.toMatchObject({ code: 'revision-conflict' })
  })

  it('uses callable lifecycle contracts and owner upload paths', async () => {
    const sdk = createFakeSdk()
    const repository = createMiniSiteRepository(
      { db: {}, storage: {}, functions: {} },
      sdk,
    )

    await repository.createSite({
      name: 'New site',
      slug: 'new-site',
      templateId: 'blank',
    })
    const upload = await repository.uploadDraftAsset({
      uid: 'user-1',
      siteId: 'site-1',
      assetId: 'asset-1',
      file: { type: 'image/png', size: 1200 },
    })

    expect(sdk.calls).toContainEqual([
      'callable',
      'createMiniSite',
      { name: 'New site', slug: 'new-site', templateId: 'blank' },
    ])
    expect(upload).toEqual({
      storagePath: 'mini-site-drafts/user-1/site-1/asset-1',
      url: 'https://storage.example/mini-site-drafts/user-1/site-1/asset-1',
    })
  })

  it('returns daily and summary analytics through owner paths', async () => {
    const sdk = createFakeSdk()
    sdk.documents.set('users/user-1/sites/site-1/analytics/summary', {
      totalViews: 12,
      totalClicks: 5,
      linkClicks: { link1: 5 },
    })
    const repository = createMiniSiteRepository(
      { db: {}, storage: {}, functions: {} },
      sdk,
    )

    await expect(repository.getAnalytics('user-1', 'site-1')).resolves.toEqual({
      summary: {
        totalViews: 12,
        totalClicks: 5,
        linkClicks: { link1: 5 },
      },
      days: [{ date: '2026-07-26', views: 4, clicks: 2 }],
      linkClicks: { link1: 5 },
    })
  })
})
