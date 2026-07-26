import { describe, expect, it } from 'vitest'
import { cloneTemplate } from './templates.js'
import { themeToCssVariables } from './themeCss.js'

describe('themeToCssVariables', () => {
  it('maps validated theme values to mini-site CSS variables', () => {
    const { theme } = cloneTemplate('creator')

    expect(themeToCssVariables(theme)).toMatchObject({
      '--mini-bg': '#e9e5ff',
      '--mini-bg-secondary': '#d8f8f2',
      '--mini-text': '#081d21',
      '--mini-button-radius': '16px',
      '--mini-align': 'center',
    })
  })

  it('never reflects arbitrary input keys into styles', () => {
    const styles = themeToCssVariables({
      colors: { text: '#000000' },
      '--danger': 'url(javascript:alert(1))',
      arbitrary: { value: 'unsafe' },
    })

    expect(styles['--danger']).toBeUndefined()
    expect(styles.arbitrary).toBeUndefined()
    expect(Object.keys(styles).every((key) => key.startsWith('--mini-'))).toBe(
      true,
    )
  })
})
