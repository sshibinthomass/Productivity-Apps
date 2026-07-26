import { useEffect, useMemo, useState } from 'react'
import { applyTheme, readStoredTheme, writeStoredTheme } from './theme.js'
import { ThemeContext } from './themeContext.js'

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme())

  useEffect(() => {
    applyTheme(theme)
    writeStoredTheme(theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) =>
          currentTheme === 'light' ? 'dark' : 'light',
        )
      },
    }),
    [theme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
