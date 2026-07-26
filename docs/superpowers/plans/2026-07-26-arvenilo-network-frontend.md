# Arvenilo Network Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Productivity Apps as a responsive Arvenilo Network application directory with Multi Link Opener available now and three honest coming-soon applications.

**Architecture:** Preserve the existing React Router and registry-driven application structure. Extend the registry with availability metadata, build focused brand and network components around it, and restyle the shell and Multi Link Opener with copied handoff assets and tokens while leaving link-processing behavior unchanged.

**Tech Stack:** React 19, React Router 7, Vite 8, Vitest 4, CSS, locally hosted WOFF2 fonts and approved PNG identity assets

## Global Constraints

- Product name is exactly `Arvenilo Network`.
- Multi Link Opener remains available at `/multi-link-opener`.
- Future applications are `Text Formatter`, `Focus Timer`, and `Quick Notes`, each labelled `COMING SOON`.
- Only applications with `status: 'available'`, a non-null path, and a non-null component become routes.
- Use the approved Arvenilo Network PNG assets without alteration.
- Use the handoff's exact palette, Sora/Inter/IBM Plex Mono typography roles, spacing, radii, motion, and semantic color roles.
- Target WCAG 2.2 AA, minimum `44 × 44px` controls, visible `3px` Signal Mint focus, reduced motion, and no horizontal overflow from `320px` upward.
- Do not change link parsing, validation, scheduling, or tab-opening behavior.
- Do not add external runtime dependencies.

---

## File map

- `public/brand/arvenilo-network-lockup.png` — approved full identity lockup copied from the handoff.
- `public/brand/arvenilo-network-symbol.png` — approved compact network logo copied from the handoff.
- `public/fonts/*.woff2` — copied handoff fonts used by local `@font-face` declarations.
- `src/components/BrandLogo.jsx` — selects full or compact approved identity assets.
- `src/components/BrandLogo.test.jsx` — verifies variants and accessible identity.
- `src/components/Layout.jsx` — route-aware global shell.
- `src/components/Layout.test.jsx` — verifies parent branding and navigation language.
- `src/components/NetworkSignal.jsx` — semantic/CSS home network visualization.
- `src/components/AppCard.jsx` — available-link and coming-soon card variants.
- `src/components/AppCard.test.jsx` — verifies the two semantic card variants.
- `src/components/icons/AppIcons.jsx` — outline icons for announced application categories.
- `src/config/appRegistry.jsx` — complete available and coming-soon application metadata.
- `src/config/appRegistry.test.jsx` — verifies registry statuses, uniqueness, and route eligibility.
- `src/App.jsx` — creates routes only from eligible applications while preserving protected-route composition.
- `src/App.test.jsx` — preserves public and protected authentication behavior with the availability model.
- `src/pages/HomePage.jsx` — outcome hero, status summary, network signal, and complete directory.
- `src/pages/HomePage.test.jsx` — verifies brand copy and availability content.
- `src/pages/NotFoundPage.jsx` — Arvenilo Network recovery language.
- `src/pages/NotFoundPage.test.jsx` — verifies recovery action and copy.
- `src/pages/LoginPage.jsx` — existing Google sign-in surface retained inside the rebranded shell.
- `src/components/AuthControls.jsx` — existing account states retained inside the rebranded header.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx` — task-first branded workspace markup.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx` — preserves behavior-facing contracts and checks new structure.
- `src/styles/global.css` — handoff tokens, fonts, shell, home, cards, shared controls, and responsive rules.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.css` — tool-specific responsive workspace and state styling.
- `index.html` — Arvenilo Network title, description, theme color, and favicon.
- `README.md` — parent product and route documentation.

### Task 1: Registry availability model and eligible routes

**Files:**
- Modify: `src/config/appRegistry.test.jsx`
- Modify: `src/config/appRegistry.jsx`
- Create: `src/components/icons/AppIcons.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Produces: `appRegistry: AppEntry[]`
- Produces: `availableApps: AppEntry[]`
- Produces: `isRoutableApp(app: AppEntry): boolean`
- Produces: `TextIcon`, `TimerIcon`, and `NotesIcon` React components
- `AppEntry.status` is `'available' | 'coming-soon'`

- [ ] **Step 1: Write failing registry tests**

Add tests that require one available entry, three coming-soon entries, the exact
future titles, and route eligibility:

```jsx
import { appRegistry, availableApps } from './appRegistry.jsx'

it('models the available and announced Arvenilo Network applications', () => {
  expect(appRegistry).toHaveLength(4)
  expect(appRegistry.filter((app) => app.status === 'available')).toHaveLength(1)
  expect(appRegistry.filter((app) => app.status === 'coming-soon')).toHaveLength(3)
  expect(appRegistry.map((app) => app.title)).toEqual([
    'Multi Link Opener',
    'Text Formatter',
    'Focus Timer',
    'Quick Notes',
  ])
})

it('exposes routes only for complete available applications', () => {
  expect(availableApps).toHaveLength(1)
  expect(availableApps[0]).toMatchObject({
    title: 'Multi Link Opener',
    path: '/multi-link-opener',
    status: 'available',
  })
  expect(typeof availableApps[0].component).toBe('function')
})
```

- [ ] **Step 2: Run the registry test and verify RED**

Run: `npm run test:run -- src/config/appRegistry.test.jsx`

Expected: FAIL because `availableApps`, statuses, and announced applications do
not exist.

- [ ] **Step 3: Implement the registry and icon set**

Add three simple `24 × 24` outline SVG icons to `AppIcons.jsx`. Extend every
registry entry with `category` and `status`; use `null` path/component values for
future entries. Export:

```jsx
export function isRoutableApp(app) {
  return (
    app.status === 'available' &&
    typeof app.path === 'string' &&
    typeof app.component === 'function'
  )
}

export const availableApps = appRegistry.filter(isRoutableApp)
```

Update `App.jsx` to map `registry.filter(isRoutableApp)`, preserving its
injectable registry prop and `ProtectedRoute` boundary. Add
`status: 'available'` to the protected fixture in `src/App.test.jsx`.

- [ ] **Step 4: Run the registry test and verify GREEN**

Run: `npm run test:run -- src/config/appRegistry.test.jsx`

Expected: all registry tests PASS.

- [ ] **Step 5: Commit the registry model**

```bash
git add src/config/appRegistry.jsx src/config/appRegistry.test.jsx src/components/icons/AppIcons.jsx src/App.jsx src/App.test.jsx
git commit -m "feat: model Arvenilo Network applications"
```

### Task 2: Approved identity assets and global brand shell

**Files:**
- Create: `public/brand/arvenilo-network-lockup.png`
- Create: `public/brand/arvenilo-network-symbol.png`
- Create: `public/fonts/sora-latin-wght-normal.woff2`
- Create: `public/fonts/inter-latin-wght-normal.woff2`
- Create: `public/fonts/inter-latin-wght-italic.woff2`
- Create: `public/fonts/ibm-plex-mono-latin-400-normal.woff2`
- Create: `public/fonts/ibm-plex-mono-latin-500-normal.woff2`
- Create: `src/components/BrandLogo.jsx`
- Create: `src/components/BrandLogo.test.jsx`
- Modify: `src/components/Layout.jsx`
- Create: `src/components/Layout.test.jsx`
- Modify: `index.html`

**Interfaces:**
- Produces: `BrandLogo({ variant: 'lockup' | 'symbol', className?: string })`
- Consumes: `useLocation()` from React Router in `Layout`

- [ ] **Step 1: Write failing brand and shell tests**

Create `BrandLogo.test.jsx`:

```jsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BrandLogo from './BrandLogo.jsx'

describe('BrandLogo', () => {
  it('renders the approved Arvenilo Network identity accessibly', () => {
    const markup = renderToStaticMarkup(<BrandLogo />)
    expect(markup).toContain('alt="Arvenilo Network"')
    expect(markup).toContain('arvenilo-network-lockup.png')
  })

  it('supports the compact approved symbol', () => {
    const markup = renderToStaticMarkup(<BrandLogo variant="symbol" />)
    expect(markup).toContain('arvenilo-network-symbol.png')
  })
})
```

Create `Layout.test.jsx` using `MemoryRouter` and require the parent identity,
promise, and route-aware `Network index` link. Wrap `Layout` in
`AuthContext.Provider` with a signed-out, non-loading value so the real
`AuthControls` component renders.

- [ ] **Step 2: Run the new tests and verify RED**

Run: `npm run test:run -- src/components/BrandLogo.test.jsx src/components/Layout.test.jsx`

Expected: FAIL because `BrandLogo` and Arvenilo shell copy do not exist.

- [ ] **Step 3: Copy approved assets without modification**

Copy the two exact network PNGs and five required WOFF2 files from
`Arvenilo-Design-Handoff/` into the public paths listed above. Do not process or
re-encode the files. Confirm copied and source file hashes match with
`Get-FileHash`.

- [ ] **Step 4: Implement `BrandLogo` and rebrand `Layout`**

Use `import.meta.env.BASE_URL` to make asset URLs work locally and on GitHub
Pages. The home link accessible name is `Arvenilo Network home`; nested routes
show `Network index`. Footer copy is:

```jsx
<p>Where Intelligence Meets Reality.</p>
<p>Arvenilo Network</p>
```

- [ ] **Step 5: Update document metadata**

Set:

```html
<meta
  name="description"
  content="Arvenilo Network brings focused productivity applications into one connected workspace."
/>
<link
  rel="icon"
  type="image/png"
  href="%BASE_URL%brand/arvenilo-network-symbol.png"
/>
<meta name="theme-color" content="#081D21" />
<title>Arvenilo Network</title>
```

- [ ] **Step 6: Run brand and shell tests and verify GREEN**

Run: `npm run test:run -- src/components/BrandLogo.test.jsx src/components/Layout.test.jsx`

Expected: all brand and layout tests PASS.

- [ ] **Step 7: Commit the brand shell**

```bash
git add public/brand public/fonts src/components/BrandLogo.jsx src/components/BrandLogo.test.jsx src/components/Layout.jsx src/components/Layout.test.jsx index.html
git commit -m "feat: add Arvenilo Network brand shell"
```

### Task 3: Application network home experience

**Files:**
- Create: `src/components/AppCard.test.jsx`
- Modify: `src/components/AppCard.jsx`
- Create: `src/components/NetworkSignal.jsx`
- Create: `src/pages/HomePage.test.jsx`
- Modify: `src/pages/HomePage.jsx`

**Interfaces:**
- `AppCard({ app })` consumes one registry entry.
- `NetworkSignal()` renders the home hero's decorative connection model.
- `HomePage()` consumes all `appRegistry` entries.

- [ ] **Step 1: Write failing card tests**

Test an available entry inside `MemoryRouter` and a coming-soon entry:

```jsx
expect(availableMarkup).toContain('<a')
expect(availableMarkup).toContain('AVAILABLE NOW')
expect(availableMarkup).toContain('Open application')

expect(futureMarkup).toContain('<article')
expect(futureMarkup).not.toContain('<a')
expect(futureMarkup).toContain('COMING SOON')
expect(futureMarkup).toContain('Announced for the network')
```

- [ ] **Step 2: Write the failing home test**

Require:

```jsx
expect(markup).toContain('Small tools. Connected work.')
expect(markup).toContain('ARVENILO NETWORK / PRODUCTIVITY SYSTEM')
expect(markup).toContain('1 available now')
expect(markup).toContain('3 coming soon')
expect(markup).toContain('Multi Link Opener')
expect(markup).toContain('Text Formatter')
expect(markup).toContain('Focus Timer')
expect(markup).toContain('Quick Notes')
```

- [ ] **Step 3: Run home and card tests and verify RED**

Run: `npm run test:run -- src/components/AppCard.test.jsx src/pages/HomePage.test.jsx`

Expected: FAIL because the card variants, network signal, and new home copy do
not exist.

- [ ] **Step 4: Implement semantic card variants**

Share inner card content between a `Link` wrapper for available entries and an
`article` wrapper for future entries. Do not attach click handlers, `tabIndex`,
or disabled controls to coming-soon cards.

- [ ] **Step 5: Implement `NetworkSignal` and the new home composition**

Create a bounded CSS-hook structure:

```jsx
<div className="network-signal" aria-hidden="true">
  <span className="network-signal__frame" />
  <span className="network-signal__path network-signal__path--a" />
  <span className="network-signal__path network-signal__path--b" />
  <span className="network-signal__node network-signal__node--active" />
  <span className="network-signal__node network-signal__node--future-a" />
  <span className="network-signal__node network-signal__node--future-b" />
  <span className="network-signal__focus" />
</div>
```

Compose the approved hero and application network copy from the registry. Use
actual registry counts rather than hard-coded totals.

- [ ] **Step 6: Run home and card tests and verify GREEN**

Run: `npm run test:run -- src/components/AppCard.test.jsx src/pages/HomePage.test.jsx`

Expected: all home and card tests PASS.

- [ ] **Step 7: Commit the home experience**

```bash
git add src/components/AppCard.jsx src/components/AppCard.test.jsx src/components/NetworkSignal.jsx src/pages/HomePage.jsx src/pages/HomePage.test.jsx
git commit -m "feat: build Arvenilo application network"
```

### Task 4: Reorganized Multi Link Opener and recovery state

**Files:**
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`
- Create: `src/pages/NotFoundPage.test.jsx`
- Modify: `src/pages/NotFoundPage.jsx`

**Interfaces:**
- Preserves: `MultiLinkOpenerPage()`
- Preserves: `ResultPanel({ result })`
- Preserves: calls to `submitLinks(text, delaySeconds)`

- [ ] **Step 1: Add failing workspace structure tests**

Require the breadcrumb, task-first language, and form-before-guidance source
order:

```jsx
expect(markup).toContain('Arvenilo Network')
expect(markup).toContain('Multi Link Opener')
expect(markup).toContain('Open every link in one controlled pass.')
expect(markup.indexOf('class="link-form"')).toBeLessThan(
  markup.indexOf('class="link-guide"'),
)
```

Keep all existing assertions for labels, delay control, disabled empty state,
validation messages, and adjusted links.

- [ ] **Step 2: Add a failing not-found test**

Require `This application is outside the network.` and a `Return to network`
link with `href="/"` under `MemoryRouter`.

- [ ] **Step 3: Run workspace tests and verify RED**

Run: `npm run test:run -- src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx src/pages/NotFoundPage.test.jsx`

Expected: FAIL on new structure and copy only; existing behavior assertions
remain green.

- [ ] **Step 4: Reorganize workspace markup without changing handlers**

Keep the existing state, `handleSubmit`, `handleClear`, textarea props, delay
input props, and `ResultPanel` logic. Move the form before the guide in source
order and add page, breadcrumb, header, guide, and form surface hooks required
by the design.

- [ ] **Step 5: Rebrand the not-found recovery state**

Use the exact tested copy and `Return to network` action.

- [ ] **Step 6: Run workspace tests and verify GREEN**

Run: `npm run test:run -- src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx src/pages/NotFoundPage.test.jsx`

Expected: all workspace and recovery tests PASS.

- [ ] **Step 7: Run link behavior tests unchanged**

Run: `npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js`

Expected: all existing link behavior tests PASS with no modifications.

- [ ] **Step 8: Commit the workspace reorganization**

```bash
git add src/apps/multi-link-opener/MultiLinkOpenerPage.jsx src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx src/pages/NotFoundPage.jsx src/pages/NotFoundPage.test.jsx
git commit -m "feat: reorganize Arvenilo tool workspace"
```

### Task 5: Precision Spatial styling and responsive behavior

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.css`

**Interfaces:**
- Consumes the class hooks delivered by Tasks 2–4.
- Produces no JavaScript interface; visual contracts are verified in-browser.

- [ ] **Step 1: Establish the local font and token foundation**

Replace the existing root variables with the exact handoff tokens. Add
`@font-face` declarations for:

```css
@font-face {
  font-family: "Sora Variable";
  src: url("/fonts/sora-latin-wght-normal.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}
```

Add equivalent Inter normal/italic and IBM Plex Mono 400/500 declarations.
Reference fonts through `--font-display`, `--font-text`, and `--font-utility`.

- [ ] **Step 2: Implement the global dark network shell**

Use Spatial Ink/Void fields, Dark Border structure, the approved lockup at
desktop, compact symbol at mobile, restrained grid lines, and a capped `1600px`
shell. Keep all foreground contrast within approved handoff pairs. Retain and
re-theme every existing `AuthControls` and `LoginPage` state, including loading,
signed out, signed in, disabled, and error feedback.

- [ ] **Step 3: Implement the hero and network signal**

Create a split desktop hero and stacked mobile hero. Use one Anchor Gold focus
point; all other active lines/nodes use mint or violet. Add one convergence
reveal and no continuous ambient motion.

- [ ] **Step 4: Implement application card states**

Available cards use mint status/action emphasis and visible hover/focus
feedback. Coming-soon articles use violet status, remain visually quieter, and
do not mimic disabled controls.

- [ ] **Step 5: Implement the task-focused tool workspace**

Use a Reality Mist form surface and Spatial Ink guidance surface. Apply clear
form labels, bordered controls, mint primary action, explicit disabled state,
mint success, gold attention, and red error treatment. Ensure long invalid URLs
wrap instead of widening the viewport.

- [ ] **Step 6: Implement breakpoints and accessibility states**

Add content-driven rules aligned with `767px`, `1023px`, and `1440px`. Guarantee
the mobile form-first layout, minimum targets, full-width narrow actions, a
global `3px` focus ring, and a reduced-motion override.

- [ ] **Step 7: Run automated verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: all commands exit `0`; tests have zero failures, ESLint has zero
errors, Vite completes the production build, and every pre-existing Firebase
authentication test remains green.

- [ ] **Step 8: Commit the visual system**

```bash
git add src/styles/global.css src/apps/multi-link-opener/MultiLinkOpenerPage.css
git commit -m "feat: apply Arvenilo Precision Spatial theme"
```

### Task 6: Documentation and browser verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents the final routes and Arvenilo Network registry model.

- [ ] **Step 1: Update README**

Rename the project heading to `Arvenilo Network`, describe the application
directory, list Multi Link Opener as `Available now`, list the three future
applications as `Coming soon`, and retain local development and GitHub Pages
instructions.

- [ ] **Step 2: Verify desktop and mobile layouts**

Run the Vite development server on a confirmed free local port. Inspect `/` and
`/multi-link-opener` at `320`, `390`, `768`, `1024`, `1440`, and `1920px`.
For each width, verify:

- no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`);
- headings and status labels are fully visible;
- the logo preserves proportions and clear space;
- application counts and statuses are visible in text;
- coming-soon cards are non-interactive;
- the link form precedes guidance on narrow screens;
- controls remain at least `44px` high.

- [ ] **Step 3: Verify interaction and accessibility**

Use keyboard navigation to inspect focus visibility on the brand link, Network
index link, application link, textarea, delay field, and both form buttons.
Fill sample links, confirm the live count changes, and confirm status output is
announced without console errors. Emulate reduced motion and confirm transforms
and animations are effectively disabled.

- [ ] **Step 4: Critique screenshots and make bounded corrections**

Capture full-page screenshots at `390px` and `1440px` for both routes. Compare
them with the approved design and handoff rules. Correct only concrete layout,
hierarchy, overflow, contrast, spacing, or identity problems found during this
review, then rerun the affected automated and browser checks.

- [ ] **Step 5: Run final fresh verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
git diff --check
git status --short
```

Expected: tests, lint, build, and diff check exit `0`; status contains only the
intended implementation files plus the user's untouched
`Arvenilo-Design-Handoff/` source directory.

- [ ] **Step 6: Commit documentation and final corrections**

```bash
git add README.md
git add src/styles/global.css src/apps/multi-link-opener/MultiLinkOpenerPage.css
git commit -m "docs: describe Arvenilo Network"
```
