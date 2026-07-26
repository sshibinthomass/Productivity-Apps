// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'

const projectId = 'demo-mini-sites'
let testEnv

const ownerDraft = {
  name: 'Maya Studio',
  slug: 'maya-studio',
  status: 'draft',
  templateId: 'blank',
  blocks: [],
  theme: {},
  seo: { title: 'Maya Studio', description: '', socialImagePath: null },
  draftRevision: 0,
  publishedRevision: 0,
  createdAt: 'server',
  updatedAt: 'server',
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})

beforeEach(async () => {
  await Promise.all([testEnv.clearFirestore(), testEnv.clearStorage()])
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await Promise.all([
      context
        .firestore()
        .doc('users/user-1/sites/site-1')
        .set(ownerDraft),
      context
        .firestore()
        .doc('publishedMiniSites/maya-studio')
        .set({ slug: 'maya-studio', blocks: [], theme: {}, seo: {} }),
      context
        .firestore()
        .doc('miniSiteSlugs/maya-studio')
        .set({ ownerId: 'user-1', siteId: 'site-1' }),
      context
        .firestore()
        .doc('users/user-1/sites/site-1/analytics/summary')
        .set({ totalViews: 4, totalClicks: 2, linkClicks: {} }),
      context
        .storage()
        .ref('mini-site-public/site-1/1/asset.png')
        .put(new Uint8Array([1, 2, 3]), { contentType: 'image/png' }),
    ])
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('Firestore mini-site rules', () => {
  it('allows owners to read and update editable draft fields', async () => {
    const db = testEnv.authenticatedContext('user-1').firestore()

    await assertSucceeds(db.doc('users/user-1/sites/site-1').get())
    await assertSucceeds(db.collection('users/user-1/sites').get())
    await assertSucceeds(
      db.doc('users/user-1/sites/site-1').update({
        name: 'Maya Works',
        draftRevision: 1,
        updatedAt: 'next-server-value',
      }),
    )
  })

  it('denies signed-out and cross-user draft access', async () => {
    const signedOut = testEnv.unauthenticatedContext().firestore()
    const other = testEnv.authenticatedContext('user-2').firestore()

    await assertFails(signedOut.doc('users/user-1/sites/site-1').get())
    await assertFails(other.doc('users/user-1/sites/site-1').get())
    await assertFails(other.collection('users/user-1/sites').get())
  })

  it('denies client create, delete, and server-field mutation', async () => {
    const db = testEnv.authenticatedContext('user-1').firestore()
    await assertFails(
      db.doc('users/user-1/sites/site-2').set(ownerDraft),
    )
    await assertFails(db.doc('users/user-1/sites/site-1').delete())
    await assertFails(
      db.doc('users/user-1/sites/site-1').update({
        status: 'published',
        draftRevision: 1,
        updatedAt: 'next',
      }),
    )
  })

  it('enforces the 25-block server boundary on draft updates', async () => {
    const db = testEnv.authenticatedContext('user-1').firestore()
    const blocks = Array.from({ length: 26 }, (_, index) => ({
      id: `link-${index}`,
      type: 'link',
      visible: true,
      content: { label: `Link ${index}`, url: 'https://example.com' },
    }))

    await assertFails(
      db.doc('users/user-1/sites/site-1').update({
        blocks,
        draftRevision: 1,
        updatedAt: 'next',
      }),
    )
  })

  it('allows exact public reads but denies listing and writes', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore()

    await assertSucceeds(
      publicDb.doc('publishedMiniSites/maya-studio').get(),
    )
    await assertFails(publicDb.collection('publishedMiniSites').get())
    await assertFails(
      publicDb
        .doc('publishedMiniSites/maya-studio')
        .set({ slug: 'stolen' }),
    )
  })

  it('keeps reservations private and analytics owner-readable only', async () => {
    const owner = testEnv.authenticatedContext('user-1').firestore()
    const other = testEnv.authenticatedContext('user-2').firestore()

    await assertFails(owner.doc('miniSiteSlugs/maya-studio').get())
    await assertSucceeds(
      owner
        .doc('users/user-1/sites/site-1/analytics/summary')
        .get(),
    )
    await assertFails(
      other
        .doc('users/user-1/sites/site-1/analytics/summary')
        .get(),
    )
    await assertFails(
      owner
        .doc('users/user-1/sites/site-1/analytics/summary')
        .update({ totalViews: 100 }),
    )
  })
})

describe('Storage mini-site rules', () => {
  it('allows owners to upload supported private images', async () => {
    const storage = testEnv.authenticatedContext('user-1').storage()

    await assertSucceeds(
      storage
        .ref('mini-site-drafts/user-1/site-1/photo.webp')
        .put(new Uint8Array([1, 2, 3]), { contentType: 'image/webp' }),
    )
  })

  it('denies cross-user, unsupported, and oversized private uploads', async () => {
    const otherStorage = testEnv.authenticatedContext('user-2').storage()
    const ownerStorage = testEnv.authenticatedContext('user-1').storage()

    await assertFails(
      otherStorage
        .ref('mini-site-drafts/user-1/site-1/photo.png')
        .put(new Uint8Array([1]), { contentType: 'image/png' }),
    )
    await assertFails(
      ownerStorage
        .ref('mini-site-drafts/user-1/site-1/vector.svg')
        .put(new Uint8Array([1]), { contentType: 'image/svg+xml' }),
    )
    await assertFails(
      ownerStorage
        .ref('mini-site-drafts/user-1/site-1/large.png')
        .put(new Uint8Array(5 * 1024 * 1024 + 1), {
          contentType: 'image/png',
        }),
    )
  })

  it('allows public reads and denies public-prefix writes', async () => {
    const publicStorage = testEnv.unauthenticatedContext().storage()

    await assertSucceeds(
      publicStorage
        .ref('mini-site-public/site-1/1/asset.png')
        .getMetadata(),
    )
    await assertFails(
      publicStorage
        .ref('mini-site-public/site-1/1/new.png')
        .put(new Uint8Array([1]), { contentType: 'image/png' }),
    )
  })
})
