# Arvenilo Network Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make light mode the default Arvenilo Network appearance and provide a persistent, accessible switch to the existing dark mode.

**Architecture:** A framework-independent theme utility validates, persists, and applies theme values. A React provider owns the active theme, and a shared header control toggles it on every route. Semantic CSS roles allow the existing home, authentication, and Multi Link Opener surfaces to render correctly in both modes.

**Tech Stack:** React 19, Vite 8, Vitest 4, Testing Library, CSS custom properties, browser `localStorage`

## Global Constraints

- New visitors start in light mode regardless of operating-system theme.
- The only valid values are `light` and `dark`.
- A valid stored value is restored before the application renders.
- Missing, inaccessible, or invalid storage falls back to light.
- The root element carries `data-theme="light"` or `data-theme="dark"`.
- The `color-scheme` property and `meta[name="theme-color"]` follow the active theme.
- The control is available on every route, keyboard-accessible, and at least 44 by 44 pixels.
- Light mode uses Reality Mist `#F4FBFA`, Spatial Ink `#081D21`, Interface White `#FFFFFF`, Border Light `#C9DADA`, Signal Mint `#5EEAD4`, Digital Violet `#7456F1`, Anchor Gold `#F4B942`, and Context Slate `#4D6265`.
- Dark mode preserves the existing Arvenilo Precision Spatial presentation.
- Do not add automatic system-theme detection, a third theme state, or account synchronization.

---

## File Structure

- Create `src/theme/theme.js`: valid values, safe storage access, and document metadata application.
- Create `src/theme/theme.test.js`: utility behavior with real storage and DOM objects.
- Create `src/theme/themeContext.js`: React context and `useTheme` consumer hook.
- Create `src/theme/ThemeProvider.jsx`: stateful provider that applies and persists changes.
- Create `src/theme/ThemeProvider.test.jsx`: provider initialization and toggle behavior.
- Create `src/components/ThemeToggle.jsx`: accessible header switch.
- Create `src/components/ThemeToggle.test.jsx`: label, pressed state, and click behavior.
- Modify `src/components/Layout.jsx`: render the switch on all routes.
- Modify `src/components/Layout.test.jsx`: assert the shared switch is present.
- Modify `src/main.jsx`: install the provider.
- Modify `src/styles/global.css`: semantic theme roles and responsive switch styling.
- Modify `src/apps/multi-link-opener/MultiLinkOpenerPage.css`: consume semantic roles.
- Create `src/styles/themeStyles.test.js`: guard both theme token sets and component adoption.
- Modify `index.html`: use the light browser theme color before JavaScript loads.

### Task 1: Safe Theme Utility

**Files:**

- Create: `src/theme/theme.js`
- Create: `src/theme/theme.test.js`

**Interfaces:**

- Produces: `THEME_STORAGE_KEY: "arvenilo-theme"`
- Produces: `DEFAULT_THEME: "light"`
- Produces: `readStoredTheme(storage): "light" | "dark"`
- Produces: `writeStoredTheme(theme, storage): boolean`
- Produces: `applyTheme(theme, documentNode): "light" | "dark"`

- [ ] **Step 1: Write the failing utility tests**

```js
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
})
```

- [ ] **Step 2: Run the utility tests and verify RED**

Run: `npm.cmd test -- src/theme/theme.test.js --run`

Expected: FAIL because `src/theme/theme.js` does not exist.

- [ ] **Step 3: Implement the utility**

```js
export const THEME_STORAGE_KEY = 'arvenilo-theme'
export const DEFAULT_THEME = 'light'

const themes = new Set(['light', 'dark'])
const themeColors = {
  light: '#F4FBFA',
  dark: '#081D21',
}

function normalizeTheme(theme) {
  return themes.has(theme) ? theme : DEFAULT_THEME
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
```

- [ ] **Step 4: Run the utility tests and verify GREEN**

Run: `npm.cmd test -- src/theme/theme.test.js --run`

Expected: 4 tests PASS with no warnings.

- [ ] **Step 5: Commit the utility**

```powershell
git add src/theme/theme.js src/theme/theme.test.js
git commit -m "feat: add persistent theme utilities"
```

### Task 2: React Theme State

**Files:**

- Create: `src/theme/themeContext.js`
- Create: `src/theme/ThemeProvider.jsx`
- Create: `src/theme/ThemeProvider.test.jsx`
- Modify: `src/main.jsx`

**Interfaces:**

- Consumes: `readStoredTheme`, `writeStoredTheme`, and `applyTheme` from Task 1.
- Produces: `ThemeContext`
- Produces: `useTheme(): { theme: "light" | "dark", toggleTheme: () => void }`
- Produces: `ThemeProvider({ children })`

- [ ] **Step 1: Write the failing provider tests**

```jsx
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
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
    document.body.innerHTML = '<div id="test-root"></div>'
  })

  it('provides light mode by default', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )
    expect(markup).toContain('>light</button>')
  })

  it('restores dark mode and persists a switch back to light', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const root = createRoot(document.getElementById('test-root'))

    await act(async () => {
      root.render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      )
    })
    expect(document.querySelector('button').textContent).toBe('dark')

    await act(async () => {
      document.querySelector('button').click()
    })
    expect(document.querySelector('button').textContent).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
```

- [ ] **Step 2: Run the provider tests and verify RED**

Run: `npm.cmd test -- src/theme/ThemeProvider.test.jsx --run`

Expected: FAIL because the provider and context modules do not exist.

- [ ] **Step 3: Implement the context and provider**

`src/theme/themeContext.js`:

```js
import { createContext, useContext } from 'react'

export const ThemeContext = createContext(null)

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return value
}
```

`src/theme/ThemeProvider.jsx`:

```jsx
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
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === 'light' ? 'dark' : 'light',
        ),
    }),
    [theme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
```

Before `createRoot(...)` in `src/main.jsx`, apply the stored theme synchronously
so the first painted frame uses the correct mode:

```js
applyTheme(readStoredTheme())
```

Then wrap `<AuthProvider>` with `<ThemeProvider>`. Import `applyTheme` and
`readStoredTheme` from `./theme/theme.js`, and import `ThemeProvider` from
`./theme/ThemeProvider.jsx`.

- [ ] **Step 4: Run provider and existing application tests**

Run: `npm.cmd test -- src/theme/ThemeProvider.test.jsx src/App.test.jsx --run`

Expected: provider tests and existing app tests PASS.

- [ ] **Step 5: Commit the React theme state**

```powershell
git add src/theme/themeContext.js src/theme/ThemeProvider.jsx src/theme/ThemeProvider.test.jsx src/main.jsx
git commit -m "feat: provide light-first theme state"
```

### Task 3: Accessible Header Switch

**Files:**

- Create: `src/components/ThemeToggle.jsx`
- Create: `src/components/ThemeToggle.test.jsx`
- Modify: `src/components/Layout.jsx`
- Modify: `src/components/Layout.test.jsx`

**Interfaces:**

- Consumes: `useTheme()` from Task 2.
- Produces: `ThemeToggle`, a button with `aria-pressed`, an action label, and decorative sun/moon marks.

- [ ] **Step 1: Write the failing switch test**

```jsx
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
    fireEvent.click(control)
    expect(toggleTheme).toHaveBeenCalledOnce()
  })
})
```

Add a `Layout` assertion that its static markup contains
`aria-label="Switch to dark mode"` when wrapped in a light `ThemeContext`.

- [ ] **Step 2: Run the component tests and verify RED**

Run: `npm.cmd test -- src/components/ThemeToggle.test.jsx src/components/Layout.test.jsx --run`

Expected: FAIL because `ThemeToggle.jsx` does not exist and Layout has no theme context.

- [ ] **Step 3: Implement and install the switch**

```jsx
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
        <span className="theme-toggle__sun">☀</span>
        <span className="theme-toggle__moon">☾</span>
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__label">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
```

Import `ThemeToggle` in `Layout.jsx` and render it inside
`.site-header__actions` before `<AuthControls />`. Update the Layout test helper
to wrap Layout in:

```jsx
<ThemeContext.Provider
  value={{ theme: 'light', toggleTheme: vi.fn() }}
>
  <Layout>...</Layout>
</ThemeContext.Provider>
```

- [ ] **Step 4: Run the switch and layout tests**

Run: `npm.cmd test -- src/components/ThemeToggle.test.jsx src/components/Layout.test.jsx --run`

Expected: all switch and layout tests PASS.

- [ ] **Step 5: Commit the header switch**

```powershell
git add src/components/ThemeToggle.jsx src/components/ThemeToggle.test.jsx src/components/Layout.jsx src/components/Layout.test.jsx
git commit -m "feat: add accessible theme switch"
```

### Task 4: Dual-Theme Visual System

**Files:**

- Create: `src/styles/themeStyles.test.js`
- Modify: `src/styles/global.css`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.css`
- Modify: `index.html`

**Interfaces:**

- Consumes: root `data-theme` from Task 1.
- Produces: semantic CSS roles shared by global and tool-specific surfaces.

- [ ] **Step 1: Write the failing style contract**

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const globalCss = readFileSync(
  new URL('./global.css', import.meta.url),
  'utf8',
)
const toolCss = readFileSync(
  new URL('../apps/multi-link-opener/MultiLinkOpenerPage.css', import.meta.url),
  'utf8',
)

describe('theme style contract', () => {
  it('defines light and dark semantic theme roles', () => {
    expect(globalCss).toContain(':root[data-theme="light"]')
    expect(globalCss).toContain(':root[data-theme="dark"]')
    expect(globalCss).toContain('--theme-canvas:')
    expect(globalCss).toContain('--theme-text-primary:')
    expect(globalCss).toContain('--theme-surface:')
    expect(globalCss).toContain('--theme-border:')
  })

  it('uses semantic roles in both global and tool surfaces', () => {
    expect(globalCss).toContain('background: var(--theme-canvas)')
    expect(globalCss).toContain('color: var(--theme-text-primary)')
    expect(toolCss).toContain('background: var(--theme-form-surface)')
    expect(toolCss).toContain('color: var(--theme-text-primary)')
  })
})
```

- [ ] **Step 2: Run the style contract and verify RED**

Run: `npm.cmd test -- src/styles/themeStyles.test.js --run`

Expected: FAIL because semantic roles and light/dark selector blocks do not exist.

- [ ] **Step 3: Define semantic role values**

Add these values after the existing brand tokens:

```css
:root,
:root[data-theme="light"] {
  --theme-canvas: var(--color-reality-mist);
  --theme-canvas-deep: #e7f1ef;
  --theme-text-primary: var(--color-spatial-ink);
  --theme-text-secondary: var(--color-context-slate);
  --theme-surface: var(--color-interface-white);
  --theme-surface-raised: #edf7f5;
  --theme-form-surface: var(--color-interface-white);
  --theme-border: var(--color-border-light);
  --theme-grid: rgb(8 29 33 / 6%);
  --theme-path: #9cb8b7;
  --theme-control: var(--color-spatial-ink);
  --theme-control-text: var(--color-interface-white);
  --theme-error: var(--color-error-dark);
}

:root[data-theme="dark"] {
  --theme-canvas: var(--color-spatial-ink);
  --theme-canvas-deep: var(--color-spatial-void);
  --theme-text-primary: var(--color-interface-white);
  --theme-text-secondary: var(--color-mist-slate);
  --theme-surface: var(--color-spatial-surface);
  --theme-surface-raised: var(--color-spatial-surface-raised);
  --theme-form-surface: var(--color-reality-mist);
  --theme-border: var(--color-border-dark);
  --theme-grid: rgb(94 234 212 / 4%);
  --theme-path: var(--color-border-dark);
  --theme-control: var(--color-signal-mint);
  --theme-control-text: var(--color-spatial-ink);
  --theme-error: var(--color-error-light);
}
```

Set `html`, `body`, shell text, cards, navigation, footer, network map,
not-found/auth states, breadcrumb, workbench, and guide to these roles. Keep
form inputs dark-on-light in both themes by using
`--theme-form-surface`, Spatial Ink, Context Slate, and Border Light.

Use these explicit role replacements:

| Existing visual role | Semantic role |
| --- | --- |
| page `#081d21` / Spatial Ink background | `--theme-canvas` |
| page Spatial Void gradient endpoint | `--theme-canvas-deep` |
| page Interface White text | `--theme-text-primary` |
| page Mist Slate copy | `--theme-text-secondary` |
| dark card or guide surface | `--theme-surface` |
| dark hover surface | `--theme-surface-raised` |
| dark structural border or path | `--theme-border` / `--theme-path` |
| pale form panel | `--theme-form-surface` |
| global error copy | `--theme-error` |

Add the control styling:

```css
.theme-toggle {
  align-items: center;
  background: transparent;
  border: 1px solid var(--theme-border);
  border-radius: var(--radius-status);
  color: var(--theme-text-primary);
  cursor: pointer;
  display: inline-flex;
  font-family: var(--font-utility);
  font-size: 0.68rem;
  gap: var(--space-2);
  letter-spacing: 0.055em;
  min-height: 44px;
  padding: 0.35rem 0.7rem;
  text-transform: uppercase;
}

.theme-toggle__track {
  background: var(--theme-surface-raised);
  border-radius: var(--radius-status);
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 1.7rem;
  position: relative;
  width: 3.1rem;
}

.theme-toggle__sun,
.theme-toggle__moon {
  align-items: center;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.theme-toggle__thumb {
  background: var(--color-signal-mint);
  border-radius: 50%;
  height: 1.35rem;
  left: 0.18rem;
  position: absolute;
  top: 0.18rem;
  transition: transform 160ms var(--ease-standard);
  width: 1.35rem;
}

:root[data-theme="dark"] .theme-toggle__thumb {
  transform: translateX(1.38rem);
}

@media (max-width: 767px) {
  .theme-toggle__label {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
}
```

Change the initial `meta[name="theme-color"]` in `index.html` to `#F4FBFA`.

- [ ] **Step 4: Run style and component tests**

Run: `npm.cmd test -- src/styles/themeStyles.test.js src/components/ThemeToggle.test.jsx src/components/Layout.test.jsx --run`

Expected: style contract, switch, and layout tests PASS.

- [ ] **Step 5: Commit the dual-theme styling**

```powershell
git add src/styles/global.css src/styles/themeStyles.test.js src/apps/multi-link-opener/MultiLinkOpenerPage.css index.html
git commit -m "feat: add Arvenilo light theme"
```

### Task 5: Full Verification and Visual Review

**Files:**

- Modify only files required to correct a verified regression.

**Interfaces:**

- Consumes the completed dual-theme application.
- Produces a tested build and visual confirmation at desktop and mobile widths.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm.cmd test -- --run`

Expected: every test file PASS with no unhandled errors.

- [ ] **Step 2: Run static checks**

Run: `npm.cmd run lint`

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

Run: `npm.cmd run build`

Expected: exit code 0 and assets written to `dist`.

- [ ] **Step 4: Review the live application**

Open the running development URL and verify:

- Home starts in light mode after removing `arvenilo-theme`.
- Header control reads `Switch to dark mode`.
- Switching to dark updates the screen and control immediately.
- Reload preserves dark mode.
- Switching back to light persists light.
- Home and Multi Link Opener have readable text, visible borders, intentional
  hover/focus states, and no dark-only patches.
- Desktop `1440 × 1000` and mobile `390 × 844` layouts do not overflow.
- The browser theme color matches Reality Mist in light and Spatial Ink in
  dark.

- [ ] **Step 5: Confirm the worktree is clean**

Run: `git status --short`

Expected: no output.
