import { describe, expect, it } from 'vitest'
import { TEMPLATES, cloneTemplate, getTemplate } from './templates.js'

describe('mini-site templates', () => {
  it('offers four presets and a blank canvas', () => {
    expect(TEMPLATES.map(({ id }) => id)).toEqual([
      'creator',
      'portfolio',
      'minimal',
      'bold',
      'blank',
    ])
    expect(TEMPLATES.every(({ theme }) => theme.background)).toBe(true)
  })

  it('returns independent clones so edits never change a template', () => {
    const first = cloneTemplate('creator')
    const second = cloneTemplate('creator')

    first.theme.background.value = '#000000'
    first.blocks[0].content.displayName = 'Changed'

    expect(second.theme.background.value).not.toBe('#000000')
    expect(second.blocks[0].content.displayName).not.toBe('Changed')
    expect(getTemplate('creator').theme.background.value).not.toBe('#000000')
  })

  it('falls back to the blank template for unknown ids', () => {
    expect(cloneTemplate('missing').id).toBe('blank')
  })
})
