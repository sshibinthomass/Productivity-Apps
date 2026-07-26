import { describe, expect, it, vi } from 'vitest'
import {
  createFirestoreStore,
  createAnalyticsUpdates,
} from './firestoreStore.js'

describe('Firestore analytics updates', () => {
  it('writes click counts as nested maps for merge-safe per-link totals', () => {
    const increment = vi.fn((amount) => ({ increment: amount }))

    expect(
      createAnalyticsUpdates('link_click', 'link-1', { increment }),
    ).toEqual({
      summary: {
        totalClicks: { increment: 1 },
        linkClicks: { 'link-1': { increment: 1 } },
      },
      day: {
        clicks: { increment: 1 },
        linkClicks: { 'link-1': { increment: 1 } },
      },
    })
  })
})

describe('Firestore store asset boundary', () => {
  it('resolves the configured bucket only when publishing an asset', async () => {
    const copy = vi.fn().mockResolvedValue(undefined)
    const bucket = {
      name: 'example.firebasestorage.app',
      file: (path) => ({ path, copy }),
    }
    const getBucket = vi.fn(() => bucket)
    const store = createFirestoreStore({
      db: {},
      getBucket,
      FieldValue: {},
      Timestamp: {},
    })

    expect(getBucket).not.toHaveBeenCalled()
    const draft = await store.promoteAssets({
      siteId: 'site-1',
      draft: {
        draftRevision: 3,
        blocks: [
          {
            id: 'image-1',
            type: 'image',
            content: {
              storagePath: 'mini-site-drafts/user-1/site-1/image-1.webp',
              url: 'blob:private',
            },
          },
        ],
      },
    })

    expect(getBucket).toHaveBeenCalledTimes(1)
    expect(copy).toHaveBeenCalledOnce()
    expect(draft.blocks[0].content.url).toBe(
      'https://firebasestorage.googleapis.com/v0/b/example.firebasestorage.app/o/mini-site-public%2Fsite-1%2F3%2Fimage-1.webp?alt=media',
    )
  })
})
