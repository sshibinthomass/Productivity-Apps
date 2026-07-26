import { describe, expect, it } from 'vitest'
import {
  BLOCK_LIMIT,
  BLOCK_TYPES,
  LINK_BLOCK_LIMIT,
  SITE_LIMIT,
  createBlock,
  createDraft,
  duplicateBlock,
  moveBlock,
  normalizeDraft,
  removeBlock,
  updateBlock,
} from './miniSiteModel.js'

describe('mini-site model', () => {
  it('creates a blank draft that is immediately editable', () => {
    const draft = createDraft({
      name: 'Maya Studio',
      slug: 'maya-studio',
      templateId: 'blank',
    })

    expect(SITE_LIMIT).toBe(5)
    expect(BLOCK_LIMIT).toBe(25)
    expect(LINK_BLOCK_LIMIT).toBe(25)
    expect(BLOCK_TYPES).toEqual([
      'profile',
      'link',
      'heading',
      'paragraph',
      'image',
      'socials',
      'divider',
      'spacer',
    ])
    expect(draft).toMatchObject({
      name: 'Maya Studio',
      slug: 'maya-studio',
      templateId: 'blank',
      status: 'draft',
      draftRevision: 0,
      publishedRevision: 0,
    })
    expect(draft.blocks.map(({ type }) => type)).toEqual(['profile', 'link'])
    expect(new Set(draft.blocks.map(({ id }) => id)).size).toBe(2)
  })

  it.each(BLOCK_TYPES)('creates a serializable %s block', (type) => {
    const block = createBlock(type)

    expect(block).toMatchObject({
      id: expect.any(String),
      type,
      visible: true,
      content: expect.any(Object),
    })
    expect(() => JSON.stringify(block)).not.toThrow()
  })

  it('updates, moves, duplicates, and removes blocks without mutating input', () => {
    const first = createBlock('heading')
    const second = createBlock('link')
    const original = [first, second]
    const updated = updateBlock(original, first.id, {
      content: { text: 'Hello', level: 2 },
    })
    const moved = moveBlock(updated, first.id, 'down')
    const duplicated = duplicateBlock(moved, first.id)
    const removed = removeBlock(duplicated, second.id)

    expect(original[0].content.text).toBe('')
    expect(updated[0].content.text).toBe('Hello')
    expect(moved.map(({ id }) => id)).toEqual([second.id, first.id])
    expect(duplicated).toHaveLength(3)
    expect(duplicated[2]).toMatchObject({
      type: 'heading',
      content: { text: 'Hello' },
    })
    expect(duplicated[2].id).not.toBe(first.id)
    expect(removed.some(({ id }) => id === second.id)).toBe(false)
  })

  it('normalizes malformed drafts and enforces block caps', () => {
    const tooManyLinks = Array.from({ length: 30 }, () => createBlock('link'))
    const tooManyParagraphs = Array.from(
      { length: 30 },
      () => createBlock('paragraph'),
    )

    const normalized = normalizeDraft({
      name: 42,
      slug: null,
      blocks: [...tooManyLinks, ...tooManyParagraphs, { type: 'unknown' }],
      theme: null,
      seo: 'bad',
    })

    expect(normalized.name).toBe('Untitled site')
    expect(normalized.slug).toBe('')
    expect(normalized.blocks).toHaveLength(BLOCK_LIMIT)
    expect(
      normalized.blocks.filter(({ type }) => type === 'link'),
    ).toHaveLength(LINK_BLOCK_LIMIT)
    expect(normalized.blocks.some(({ type }) => type === 'unknown')).toBe(false)
    expect(normalized.theme).toEqual(expect.any(Object))
    expect(normalized.seo).toEqual(expect.any(Object))
  })

  it('does not exceed caps while duplicating blocks', () => {
    const links = Array.from({ length: LINK_BLOCK_LIMIT }, () =>
      createBlock('link'),
    )
    const full = [
      ...links,
      ...Array.from({ length: BLOCK_LIMIT - LINK_BLOCK_LIMIT }, () =>
        createBlock('paragraph'),
      ),
    ]

    expect(duplicateBlock(links, links[0].id)).toBe(links)
    expect(duplicateBlock(full, full.at(-1).id)).toBe(full)
  })
})
