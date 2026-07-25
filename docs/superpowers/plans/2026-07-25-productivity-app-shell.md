# Productivity App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished Vite and React productivity-app home page with a tested Multi Link Opener and clean GitHub Pages routes.

**Architecture:** One React SPA uses a registry to drive both the home-page cards and route declarations. Each productivity tool owns a feature folder; shared shell components own navigation and layout. Vite uses `/Productivity-Apps/` as its production base, while a static GitHub Pages fallback restores clean nested routes.

**Tech Stack:** React 19.2.8, React DOM 19.2.8, React Router DOM 7.18.1, Vite 8.1.5, Vitest 4.1.10, ESLint 10.0.1, CSS

## Global Constraints

- Home production URL is `https://<username>.github.io/Productivity-Apps`.
- Multi Link Opener production URL is `https://<username>.github.io/Productivity-Apps/multi-link-opener`.
- Browser routing must use clean URLs without hash routing.
- Vite's production base is exactly `/Productivity-Apps/`.
- Each productivity tool lives in its own folder under `src/apps/`.
- The registry is the single source of truth for card and route metadata.
- Only HTTP and HTTPS links may be opened.
- Links without a protocol are normalized to HTTPS.
- Blank and duplicate links are not opened.
- UI must be responsive, keyboard accessible, and respect reduced motion.
- Entered links are session state only; permanent storage is excluded.

---

## File Map

- `package.json`: scripts, production dependencies, and development tooling.
- `vite.config.js`: React plugin, production base, and Vitest settings.
- `eslint.config.js`: flat ESLint configuration for browser and test files.
- `index.html`: application entry and GitHub Pages route restoration.
- `public/404.html`: GitHub Pages nested-route redirect.
- `src/main.jsx`: React root and `BrowserRouter` basename.
- `src/App.jsx`: shared layout plus registry-driven route declarations.
- `src/config/appRegistry.jsx`: tool metadata and page component references.
- `src/components/Layout.jsx`: site header, navigation, and content shell.
- `src/components/AppCard.jsx`: accessible home-page app card.
- `src/pages/HomePage.jsx`: registry-driven card grid.
- `src/pages/NotFoundPage.jsx`: unknown-route recovery.
- `src/apps/multi-link-opener/linkUtils.js`: parsing, validation, deduplication, and tab opening.
- `src/apps/multi-link-opener/linkUtils.test.js`: utility behavior tests.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`: form state and result feedback.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.css`: feature-specific presentation.
- `src/styles/global.css`: tokens, reset, layout, home page, shared components, and responsive rules.
- `.github/workflows/deploy-pages.yml`: build and GitHub Pages deployment.
- `README.md`: local commands, extension instructions, and deployment setup.

---

### Task 1: React/Vite Shell and Registry

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/config/appRegistry.jsx`
- Create: `src/components/Layout.jsx`
- Create: `src/components/AppCard.jsx`
- Create: `src/pages/HomePage.jsx`
- Create: `src/pages/NotFoundPage.jsx`

**Interfaces:**
- Produces: `appRegistry`, an ordered array of `{ id, title, description, path, icon, accent, component }`.
- Produces: routes `/`, `/multi-link-opener`, and `*`.
- Consumes: `MultiLinkOpenerPage` from Task 3.

- [ ] **Step 1: Add package and tool configuration**

Create scripts `dev`, `build`, `preview`, `test`, `test:run`, and `lint`.
Install React and React Router as production dependencies, with Vite, Vitest,
the React Vite plugin, ESLint, browser globals, React Hooks linting, and React
Refresh linting as development dependencies.

Use this Vite configuration:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Productivity-Apps/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 2: Add the app registry and route shell**

Define the registry with this public shape:

```jsx
export const appRegistry = [
  {
    id: 'multi-link-opener',
    title: 'Multi Link Opener',
    description: 'Open a list of links in separate tabs with one click.',
    path: '/multi-link-opener',
    icon: LinkIcon,
    accent: 'violet',
    component: MultiLinkOpenerPage,
  },
]
```

Map `appRegistry` into both the `HomePage` card grid and `<Route>` elements.
Use `BrowserRouter` with a basename derived from `import.meta.env.BASE_URL`:

```jsx
const routerBase =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: Add semantic shared components**

`Layout` renders a linked product mark, a compact "All apps" link when the
current route is nested, `<main>`, and a footer. `AppCard` renders a React
Router `<Link>` whose accessible name includes the tool title. `NotFoundPage`
offers a link back to `/`.

- [ ] **Step 4: Install dependencies and verify the shell**

Run: `npm install`

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0 and a generated `dist/index.html`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js eslint.config.js index.html src
git commit -m "feat: add registry-driven productivity app shell"
```

---

### Task 2: Link Parsing and Tab Opening

**Files:**
- Create: `src/apps/multi-link-opener/linkUtils.js`
- Create: `src/apps/multi-link-opener/linkUtils.test.js`

**Interfaces:**
- Produces: `normalizeUrl(value: string): string`.
- Produces: `parseLinks(value: string): { validUrls: string[], invalidEntries: string[], duplicateCount: number, entryCount: number }`.
- Produces: `openLinks(urls: string[], opener?: Function): { openedCount: number, blockedCount: number }`.

- [ ] **Step 1: Write failing parser tests**

Add focused Vitest cases:

```js
expect(parseLinks('google.com\nhttps://openai.com').validUrls).toEqual([
  'https://google.com/',
  'https://openai.com/',
])

expect(parseLinks('\n google.com \n\nGOOGLE.com\n').entryCount).toBe(2)
expect(parseLinks('google.com\nhttps://google.com').duplicateCount).toBe(1)
expect(parseLinks('javascript:alert(1)\nnot a url').invalidEntries).toEqual([
  'javascript:alert(1)',
  'not a url',
])
```

Also test order preservation, `http://` retention, unsupported protocols,
duplicate normalization, and whitespace-only input.

- [ ] **Step 2: Run the parser tests and verify failure**

Run: `npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js`

Expected: FAIL because `linkUtils.js` does not yet export the functions.

- [ ] **Step 3: Implement parsing and validation**

Use the URL constructor after protocol normalization. Accept a URL only when
`url.protocol` is `http:` or `https:` and `url.hostname` contains at least one
non-whitespace character. Deduplicate by the serialized URL while preserving
the first occurrence.

```js
export function normalizeUrl(value) {
  const trimmed = value.trim()
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
}
```

Keep the user's trimmed original text in `invalidEntries`.

- [ ] **Step 4: Write failing opener tests**

Use an injected spy instead of the real browser:

```js
const opener = vi
  .fn()
  .mockReturnValueOnce({ opener: {} })
  .mockReturnValueOnce(null)

expect(openLinks(['https://a.com/', 'https://b.com/'], opener)).toEqual({
  openedCount: 1,
  blockedCount: 1,
})
expect(opener).toHaveBeenCalledWith('https://a.com/', '_blank', 'noopener,noreferrer')
```

- [ ] **Step 5: Implement safe tab opening and pass tests**

Call the opener synchronously once per URL with `_blank` and
`noopener,noreferrer`. When a returned window object exists, set its `opener`
to `null` inside a defensive `try/catch`. Count `null` as blocked.

Run: `npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js`

Expected: all utility tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/apps/multi-link-opener/linkUtils.js src/apps/multi-link-opener/linkUtils.test.js
git commit -m "feat: add tested multi-link parsing"
```

---

### Task 3: Multi Link Opener UI and Visual System

**Files:**
- Create: `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`
- Create: `src/apps/multi-link-opener/MultiLinkOpenerPage.css`
- Create: `src/styles/global.css`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: `parseLinks` and `openLinks` from Task 2.
- Produces: `MultiLinkOpenerPage`, the registry page component.

- [ ] **Step 1: Build the page state and submit flow**

Use controlled `text`, `result`, and `hasSubmitted` state. Derive the live
nonblank line count from `text`. On submit:

```jsx
const parsed = parseLinks(text)
const opened = openLinks(parsed.validUrls)

setResult({ ...parsed, ...opened })
setHasSubmitted(true)
```

Disable the primary action when no nonblank lines exist. Clear resets all
state. Render invalid entries as a list and expose status feedback in
`role="status"` with `aria-live="polite"`.

- [ ] **Step 2: Implement the visual direction**

Create a deep ink-and-violet productivity interface with warm off-white
surfaces, an atmospheric radial background, one expressive display typeface
loaded from a resilient system stack, and a compact monospace-style eyebrow.
Use the violet accent consistently for the Multi Link Opener card, focus
rings, primary action, and input count.

The home page uses a responsive card grid. The tool page uses a two-column
desktop layout with instructions/status beside the textarea, collapsing to
one column below 800px. Use a minimum 44px target height, `:focus-visible`,
and `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 3: Verify interaction and responsive layout**

Run: `npm run dev -- --host 127.0.0.1`

Check `/` at 1440×900 and 390×844. Check `/multi-link-opener` at the same
sizes. Verify keyboard navigation, disabled state, invalid-line output,
duplicate counts, and the browser-blocked warning.

- [ ] **Step 4: Run quality checks**

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run test:run`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: build multi link opener experience"
```

---

### Task 4: GitHub Pages Fallback, Deployment, and Documentation

**Files:**
- Modify: `index.html`
- Create: `public/404.html`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `README.md`

**Interfaces:**
- Produces: clean direct navigation to `/Productivity-Apps/multi-link-opener`.
- Consumes: Vite output in `dist/`.

- [ ] **Step 1: Add route restoration to the entry page**

Before the module script, read a `route` query parameter. When present, remove
it and restore the requested path with `history.replaceState`. Accept only
values beginning with `/` and preserve no unrelated query parameters from the
fallback request.

- [ ] **Step 2: Add the GitHub Pages 404 redirect**

`public/404.html` computes the route after `/Productivity-Apps`, appends the
original query and hash, and redirects to:

```text
/Productivity-Apps/?route=<encoded requested route>
```

If the requested path is outside the expected base, redirect to
`/Productivity-Apps/`.

- [ ] **Step 3: Add the official Pages workflow**

Trigger on pushes to `main` and manual dispatch. Grant `contents: read`,
`pages: write`, and `id-token: write`. Use Node 22, `npm ci`, `npm run build`,
`actions/configure-pages`, `actions/upload-pages-artifact` with `dist`, and
`actions/deploy-pages`. Set the deployment environment URL from the deploy
step output.

- [ ] **Step 4: Document local and deployment workflows**

Document:

```bash
npm install
npm run dev
npm run test:run
npm run lint
npm run build
```

Explain that GitHub repository settings must select "GitHub Actions" as the
Pages source. Explain how to add a feature folder and registry entry for the
next productivity app.

- [ ] **Step 5: Verify production output**

Run: `npm run test:run`

Expected: all tests PASS.

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0; `dist/index.html` references
`/Productivity-Apps/assets/`; `dist/404.html` exists.

Serve `dist` with SPA fallback disabled and verify:

- `/Productivity-Apps/` renders the home page.
- `/Productivity-Apps/multi-link-opener` first reaches `404.html`, then
  restores and renders the clean nested route.

- [ ] **Step 6: Commit**

```bash
git add index.html public/404.html .github/workflows/deploy-pages.yml README.md
git commit -m "ci: deploy app to GitHub Pages"
```

---

## Final Verification

- [ ] Run `npm run test:run`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Inspect `git status --short` and confirm only intentional files exist.
- [ ] Confirm both approved production URLs are represented in the README.
- [ ] Confirm there are no placeholders or unimplemented specification items.
