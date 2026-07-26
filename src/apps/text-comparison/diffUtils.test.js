import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH, compareTexts } from './diffUtils.js'

describe('compareTexts', () => {
  it('returns aligned unchanged rows for identical text', () => {
    expect(compareTexts('alpha\nbeta', 'alpha\nbeta', 'words')).toEqual({
      status: 'identical',
      mode: 'words',
      rows: [
        {
          id: 'row-1',
          changed: false,
          left: {
            placeholder: false,
            segments: [{ type: 'unchanged', value: 'alpha' }],
          },
          right: {
            placeholder: false,
            segments: [{ type: 'unchanged', value: 'alpha' }],
          },
        },
        {
          id: 'row-2',
          changed: false,
          left: {
            placeholder: false,
            segments: [{ type: 'unchanged', value: 'beta' }],
          },
          right: {
            placeholder: false,
            segments: [{ type: 'unchanged', value: 'beta' }],
          },
        },
      ],
      addedCount: 0,
      removedCount: 0,
    })
  })

  it('highlights a word replacement on paired lines', () => {
    const result = compareTexts(
      'const mode = "safe"',
      'const mode = "deep"',
      'words',
    )

    expect(result.status).toBe('different')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].left.segments).toContainEqual({
      type: 'removed',
      value: 'safe',
    })
    expect(result.rows[0].right.segments).toContainEqual({
      type: 'added',
      value: 'deep',
    })
    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(1)
  })

  it('counts exact Unicode code-point changes in character mode', () => {
    const result = compareTexts('cafe', 'café🙂', 'characters')

    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(2)
  })

  it('aligns inserted lines with a left placeholder', () => {
    const result = compareTexts(
      'alpha\nomega',
      'alpha\nbeta\nomega',
      'words',
    )

    expect(result.rows).toContainEqual(
      expect.objectContaining({
        changed: true,
        left: { placeholder: true, segments: [] },
        right: {
          placeholder: false,
          segments: [{ type: 'added', value: 'beta' }],
        },
      }),
    )
  })

  it('counts punctuation replacements in words mode', () => {
    const result = compareTexts('Ready.', 'Ready!', 'words')

    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(1)
  })

  it('counts changed whitespace in characters mode', () => {
    const result = compareTexts('a b', 'a  b', 'characters')

    expect(result.removedCount).toBe(0)
    expect(result.addedCount).toBe(1)
  })

  it('aligns removed lines with right placeholders', () => {
    const result = compareTexts(
      'alpha\nbeta\nomega',
      'alpha\nomega',
      'words',
    )

    expect(result.rows).toContainEqual(
      expect.objectContaining({
        left: {
          placeholder: false,
          segments: [{ type: 'removed', value: 'beta' }],
        },
        right: { placeholder: true, segments: [] },
      }),
    )
  })

  it('uses placeholders for surplus lines in a replacement group', () => {
    const result = compareTexts(
      'one\ntwo',
      'first\nsecond\nthird',
      'words',
    )

    expect(result.rows).toHaveLength(3)
    expect(result.rows[2].left.placeholder).toBe(true)
    expect(result.rows[2].right.segments).toEqual([
      { type: 'added', value: 'third' },
    ])
  })

  it('accepts text at the exact editor limit', () => {
    const text = 'a'.repeat(MAX_TEXT_LENGTH)

    expect(compareTexts(text, text, 'characters').status).toBe('identical')
  })

  it('rejects values above the editor limit', () => {
    expect(() =>
      compareTexts('a'.repeat(MAX_TEXT_LENGTH + 1), 'a', 'words'),
    ).toThrow('Each text must be 100,000 characters or fewer.')
  })

  it('rejects unsupported comparison modes', () => {
    expect(() => compareTexts('a', 'b', 'lines')).toThrow(
      'Comparison mode must be words or characters.',
    )
  })
})
