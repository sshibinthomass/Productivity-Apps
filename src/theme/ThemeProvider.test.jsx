import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from './theme.js'
import ThemeProvider from './ThemeProvider.jsx'
import { useTheme } from './themeContext.js'

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML =
      '<meta name="theme-color" content="#F4FBFA" />'
  })

  it('provides and applies light mode by default', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(screen.getByRole('button', { name: 'light' })).toBeTruthy()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('restores dark mode and persists a switch back to light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    const control = screen.getByRole('button', { name: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')

    fireEvent.click(control)

    expect(screen.getByRole('button', { name: 'light' })).toBeTruthy()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
