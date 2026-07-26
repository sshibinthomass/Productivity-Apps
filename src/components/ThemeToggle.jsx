import { useTheme } from '../theme/themeContext.js'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      aria-label={label}
      aria-pressed={isDark}
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <svg
          className="theme-toggle__sun"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
        </svg>
        <svg
          className="theme-toggle__moon"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d="M19.2 15.4A8 8 0 0 1 8.6 4.8 8.2 8.2 0 1 0 19.2 15.4Z" />
        </svg>
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__label">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
