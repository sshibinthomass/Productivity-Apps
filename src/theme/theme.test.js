import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  writeStoredTheme,
} from './theme.js'

describe('theme utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('color-scheme')
    document.head.innerHTML =
      '<meta name="theme-color" content="#081D21" />'
  })

  it('defaults to light when no valid preference exists', () => {
    expect(DEFAULT_THEME).toBe('light')
    expect(readStoredTheme(localStorage)).toBe('light')

    localStorage.setItem(THEME_STORAGE_KEY, 'system')

    expect(readStoredTheme(localStorage)).toBe('light')
  })

  it('restores valid stored theme values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredTheme(localStorage)).toBe('dark')

    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(readStoredTheme(localStorage)).toBe('light')
  })

  it('survives unavailable browser storage', () => {
    const blockedStorage = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
    }

    expect(readStoredTheme(blockedStorage)).toBe('light')
    expect(writeStoredTheme('dark', blockedStorage)).toBe(false)
  })

  it('applies root metadata for both themes', () => {
    expect(applyTheme('light', document)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(
      document.querySelector('meta[name="theme-color"]').content,
    ).toBe('#F4FBFA')

    expect(applyTheme('dark', document)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(
      document.querySelector('meta[name="theme-color"]').content,
    ).toBe('#081D21')
  })

  it('continues when browser theme metadata is missing', () => {
    document.querySelector('meta[name="theme-color"]').remove()

    expect(applyTheme('dark', document)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
