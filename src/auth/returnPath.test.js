import { describe, expect, it } from 'vitest'
import { getSafeReturnPath } from './returnPath.js'

describe('getSafeReturnPath', () => {
  it('keeps a complete internal route', () => {
    expect(getSafeReturnPath('/private?tab=1#item')).toBe(
      '/private?tab=1#item',
    )
  })

  it.each([
    null,
    undefined,
    '',
    'private',
    'https://attacker.example',
    '//attacker.example',
    '/login',
    '/login?from=/private',
    '/login#retry',
  ])('falls back to home for unsafe return value %s', (value) => {
    expect(getSafeReturnPath(value)).toBe('/')
  })
})
