import { describe, expect, it, vi } from 'vitest'
import { normalizeUrl, openLinks, parseLinks } from './linkUtils.js'

describe('normalizeUrl', () => {
  it('adds https to a domain without a protocol', () => {
    expect(normalizeUrl('  example.com/docs  ')).toBe('https://example.com/docs')
  })

  it('preserves an existing protocol for validation', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeUrl('javascript:alert(1)')).toBe('javascript:alert(1)')
  })
})

describe('parseLinks', () => {
  it('normalizes valid links and preserves their order', () => {
    expect(parseLinks('google.com\nhttps://openai.com').validUrls).toEqual([
      'https://google.com/',
      'https://openai.com/',
    ])
  })

  it('trims entries and discards blank lines', () => {
    const result = parseLinks('\n google.com \n\n openai.com \n')

    expect(result.entryCount).toBe(2)
    expect(result.validUrls).toHaveLength(2)
  })

  it('removes normalized duplicates while preserving the first occurrence', () => {
    const result = parseLinks('google.com\nhttps://google.com\nGOOGLE.com')

    expect(result.validUrls).toEqual(['https://google.com/'])
    expect(result.duplicateCount).toBe(2)
  })

  it('reports malformed values and unsupported protocols', () => {
    expect(
      parseLinks('javascript:alert(1)\nnot a url\ndata:text/plain,hello')
        .invalidEntries,
    ).toEqual([
      'javascript:alert(1)',
      'not a url',
      'data:text/plain,hello',
    ])
  })

  it('returns an empty result for whitespace-only input', () => {
    expect(parseLinks(' \n\t\n')).toEqual({
      validUrls: [],
      invalidEntries: [],
      duplicateCount: 0,
      entryCount: 0,
    })
  })
})

describe('openLinks', () => {
  it('reserves protected tabs, navigates them, and reports blocked tabs', () => {
    const replace = vi.fn()
    const append = vi.fn()
    const referrerMeta = {}
    const openedWindow = {
      opener: { unsafe: true },
      location: { replace },
      document: {
        createElement: vi.fn(() => referrerMeta),
        head: { append },
      },
    }
    const opener = vi
      .fn()
      .mockReturnValueOnce(openedWindow)
      .mockReturnValueOnce(null)

    expect(
      openLinks(['https://a.example/', 'https://b.example/'], opener),
    ).toEqual({
      openedCount: 1,
      blockedCount: 1,
    })
    expect(opener).toHaveBeenNthCalledWith(1, '', '_blank')
    expect(opener).toHaveBeenNthCalledWith(2, '', '_blank')
    expect(openedWindow.opener).toBeNull()
    expect(referrerMeta).toEqual({
      name: 'referrer',
      content: 'no-referrer',
    })
    expect(append).toHaveBeenCalledWith(referrerMeta)
    expect(replace).toHaveBeenCalledWith('https://a.example/')
  })
})
