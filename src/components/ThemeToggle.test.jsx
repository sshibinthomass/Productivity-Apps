import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeContext } from '../theme/themeContext.js'
import ThemeToggle from './ThemeToggle.jsx'

describe('ThemeToggle', () => {
  it('offers dark mode while light is active', () => {
    render(
      <ThemeContext.Provider
        value={{ theme: 'light', toggleTheme: vi.fn() }}
      >
        <ThemeToggle />
      </ThemeContext.Provider>,
    )

    const control = screen.getByRole('button', {
      name: 'Switch to dark mode',
    })

    expect(control.getAttribute('aria-pressed')).toBe('false')
    expect(control.textContent).toContain('Dark')
  })

  it('runs the theme action and describes switching to light', () => {
    const toggleTheme = vi.fn()

    render(
      <ThemeContext.Provider value={{ theme: 'dark', toggleTheme }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    )

    const control = screen.getByRole('button', {
      name: 'Switch to light mode',
    })

    expect(control.getAttribute('aria-pressed')).toBe('true')
    expect(control.textContent).toContain('Light')

    fireEvent.click(control)

    expect(toggleTheme).toHaveBeenCalledOnce()
  })
})
