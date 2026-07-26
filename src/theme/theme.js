export const THEME_STORAGE_KEY = 'arvenilo-theme'
export const DEFAULT_THEME = 'light'

const validThemes = new Set(['light', 'dark'])
const themeColors = {
  light: '#F4FBFA',
  dark: '#081D21',
}

function normalizeTheme(theme) {
  return validThemes.has(theme) ? theme : DEFAULT_THEME
}

export function readStoredTheme(storage = window.localStorage) {
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

export function writeStoredTheme(theme, storage = window.localStorage) {
  try {
    storage.setItem(THEME_STORAGE_KEY, normalizeTheme(theme))
    return true
  } catch {
    return false
  }
}

export function applyTheme(theme, documentNode = document) {
  const activeTheme = normalizeTheme(theme)
  const root = documentNode.documentElement

  root.dataset.theme = activeTheme
  root.style.colorScheme = activeTheme

  const themeColor = documentNode.querySelector('meta[name="theme-color"]')

  if (themeColor) {
    themeColor.content = themeColors[activeTheme]
  }

  return activeTheme
}
