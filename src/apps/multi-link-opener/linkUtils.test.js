import { afterEach, describe, expect, it, vi } from 'vitest'
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
  afterEach(() => {
    vi.useRealTimers()
  })

  function createOpenedWindow(onNavigate = vi.fn()) {
    const replace = vi.fn()
    const append = vi.fn()
    const referrerMeta = {}
    replace.mockImplementation((url) => onNavigate(url))

    return {
      replace,
      append,
      referrerMeta,
      openedWindow: {
        opener: { unsafe: true },
        location: { replace },
        document: {
          createElement: vi.fn(() => referrerMeta),
          head: { append },
        },
      },
    }
  }

  it('reserves every tab before navigating the first or scheduling later tabs', () => {
    const events = []
    const first = createOpenedWindow(() => events.push('navigate:first'))
    const second = createOpenedWindow(() => events.push('navigate:second'))
    const windows = [first.openedWindow, second.openedWindow]
    const opener = vi.fn(() => {
      events.push('reserve')
      return windows.shift()
    })
    const scheduler = vi.fn((callback, delayMs) => {
      events.push(`schedule:${delayMs}`)
      return callback
    })

    expect(
      openLinks(['https://a.example/', 'https://b.example/'], {
        opener,
        scheduler,
        delayMs: 2000,
      }),
    ).toEqual({
      openedCount: 2,
      blockedCount: 0,
    })
    expect(events).toEqual([
      'reserve',
      'reserve',
      'navigate:first',
      'schedule:2000',
    ])
    expect(scheduler).toHaveBeenCalledWith(expect.any(Function), 2000)
    expect(second.replace).not.toHaveBeenCalled()
  })

  it('navigates reserved tabs at cumulative delay intervals', () => {
    vi.useFakeTimers()
    const first = createOpenedWindow()
    const second = createOpenedWindow()
    const third = createOpenedWindow()
    const opener = vi
      .fn()
      .mockReturnValueOnce(first.openedWindow)
      .mockReturnValueOnce(second.openedWindow)
      .mockReturnValueOnce(third.openedWindow)

    openLinks(
      [
        'https://a.example/',
        'https://b.example/',
        'https://c.example/',
      ],
      {
        opener,
        scheduler: setTimeout,
        delayMs: 2000,
      },
    )

    expect(first.replace).toHaveBeenCalledWith('https://a.example/')
    expect(second.replace).not.toHaveBeenCalled()
    expect(third.replace).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(second.replace).toHaveBeenCalledWith('https://b.example/')
    expect(third.replace).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(third.replace).toHaveBeenCalledWith('https://c.example/')
  })

  it('navigates every reserved tab immediately when delay is zero', () => {
    const first = createOpenedWindow()
    const second = createOpenedWindow()
    const scheduler = vi.fn()

    openLinks(['https://a.example/', 'https://b.example/'], {
      opener: vi
        .fn()
        .mockReturnValueOnce(first.openedWindow)
        .mockReturnValueOnce(second.openedWindow),
      scheduler,
      delayMs: 0,
    })

    expect(first.replace).toHaveBeenCalledWith('https://a.example/')
    expect(second.replace).toHaveBeenCalledWith('https://b.example/')
    expect(scheduler).not.toHaveBeenCalled()
  })

  it('excludes blocked tabs from contiguous schedule positions', () => {
    vi.useFakeTimers()
    const first = createOpenedWindow()
    const third = createOpenedWindow()
    const opener = vi
      .fn()
      .mockReturnValueOnce(first.openedWindow)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(third.openedWindow)

    expect(
      openLinks(
        [
          'https://a.example/',
          'https://blocked.example/',
          'https://c.example/',
        ],
        {
          opener,
          scheduler: setTimeout,
          delayMs: 2000,
        },
      ),
    ).toEqual({
      openedCount: 2,
      blockedCount: 1,
    })

    expect(first.replace).toHaveBeenCalledWith('https://a.example/')
    expect(third.replace).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(third.replace).toHaveBeenCalledWith('https://c.example/')
  })

  it('protects every reserved tab before navigation', () => {
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
    expect(
      openLinks(['https://a.example/'], {
        opener: vi.fn(() => openedWindow),
        scheduler: vi.fn(),
        delayMs: 0,
      }),
    ).toEqual({
      openedCount: 1,
      blockedCount: 0,
    })
    expect(openedWindow.opener).toBeNull()
    expect(referrerMeta).toEqual({
      name: 'referrer',
      content: 'no-referrer',
    })
    expect(append).toHaveBeenCalledWith(referrerMeta)
    expect(replace).toHaveBeenCalledWith('https://a.example/')
  })
})
