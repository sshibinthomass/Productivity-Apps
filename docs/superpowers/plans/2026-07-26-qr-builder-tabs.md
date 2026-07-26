# QR Builder Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stacked QR content and design cards with an accessible two-tab workspace while keeping the live preview outside the tabs.

**Architecture:** Add a controlled `QrBuilderTabs` component that owns tab semantics, focus movement, and keyboard input while `QrGeneratorPage` owns the active tab value. Keep both existing panels mounted and hide only the inactive panel so all content, design, and uploaded-logo state survives tab changes; retain `QrPreview` as a sibling outside the tabbed builder.

**Tech Stack:** React 19, JSX, CSS, Vitest, Testing Library, Vite

## Global Constraints

- Use exactly two active-tab identifiers: `build` and `design`.
- Build QR is selected on initial render.
- Keep both panels mounted and apply the native `hidden` state to the inactive panel.
- Keep the live preview outside both tab panels.
- Do not change QR payload formats, supported QR types, generation libraries, preview/export actions, or reload persistence.
- Preserve mouse, touch, Enter, Space, Left Arrow, Right Arrow, Home, and End operation.
- Keep the existing desktop sticky preview and the below-workspace mobile preview.

---

## File Structure

- Create `src/apps/qr-generator/QrBuilderTabs.jsx`: controlled tablist markup, ARIA relationships, roving tab stops, activation, and focus movement.
- Create `src/apps/qr-generator/QrBuilderTabs.test.jsx`: focused component tests for selection, ARIA, mouse, and keyboard behavior.
- Modify `src/apps/qr-generator/QrGeneratorPage.jsx`: own `activeTab`, place both existing panels behind the tablist, and keep the preview outside.
- Modify `src/apps/qr-generator/QrGeneratorPage.test.jsx`: integration coverage for visibility, state preservation, and persistent preview access.
- Modify `src/apps/qr-generator/QrGeneratorPage.css`: connected desktop tabs, compact mobile tabs, shared card treatment, and visible focus states.

### Task 1: Accessible Tab Controls

**Files:**
- Create: `src/apps/qr-generator/QrBuilderTabs.jsx`
- Create: `src/apps/qr-generator/QrBuilderTabs.test.jsx`

**Interfaces:**
- Consumes: `activeTab: 'build' | 'design'` and `onChange(nextTab: 'build' | 'design'): void`.
- Produces: `QrBuilderTabs`, with tab ids `qr-tab-build` and `qr-tab-design` controlling panel ids `qr-panel-build` and `qr-panel-design`.

- [ ] **Step 1: Write the failing default-state and mouse-activation test**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import QrBuilderTabs from './QrBuilderTabs.jsx'

function TabsHarness() {
  const [activeTab, setActiveTab] = useState('build')
  return <QrBuilderTabs activeTab={activeTab} onChange={setActiveTab} />
}

describe('QrBuilderTabs', () => {
  it('exposes a controlled two-tab interface and activates Design by click', () => {
    render(<TabsHarness />)

    const tablist = screen.getByRole('tablist', { name: 'QR builder sections' })
    const buildTab = screen.getByRole('tab', { name: /Build QR/ })
    const designTab = screen.getByRole('tab', { name: /Design/ })

    expect(tablist.contains(buildTab)).toBe(true)
    expect(buildTab.getAttribute('aria-selected')).toBe('true')
    expect(buildTab.getAttribute('aria-controls')).toBe('qr-panel-build')
    expect(buildTab.tabIndex).toBe(0)
    expect(designTab.getAttribute('aria-selected')).toBe('false')
    expect(designTab.getAttribute('aria-controls')).toBe('qr-panel-design')
    expect(designTab.tabIndex).toBe(-1)

    fireEvent.click(designTab)

    expect(designTab.getAttribute('aria-selected')).toBe('true')
    expect(designTab.tabIndex).toBe(0)
    expect(buildTab.getAttribute('aria-selected')).toBe('false')
    expect(buildTab.tabIndex).toBe(-1)
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/apps/qr-generator/QrBuilderTabs.test.jsx`

Expected: FAIL because `./QrBuilderTabs.jsx` does not exist.

- [ ] **Step 3: Add keyboard tests before implementation**

Append these tests inside the existing `describe` block:

```jsx
it('selects and focuses tabs with arrow, Home, and End keys', () => {
  render(<TabsHarness />)
  const buildTab = screen.getByRole('tab', { name: /Build QR/ })
  const designTab = screen.getByRole('tab', { name: /Design/ })

  buildTab.focus()
  fireEvent.keyDown(buildTab, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(designTab)
  expect(designTab.getAttribute('aria-selected')).toBe('true')

  fireEvent.keyDown(designTab, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(buildTab)
  expect(buildTab.getAttribute('aria-selected')).toBe('true')

  fireEvent.keyDown(buildTab, { key: 'ArrowLeft' })
  expect(document.activeElement).toBe(designTab)
  expect(designTab.getAttribute('aria-selected')).toBe('true')

  fireEvent.keyDown(designTab, { key: 'Home' })
  expect(document.activeElement).toBe(buildTab)
  expect(buildTab.getAttribute('aria-selected')).toBe('true')

  fireEvent.keyDown(buildTab, { key: 'End' })
  expect(document.activeElement).toBe(designTab)
  expect(designTab.getAttribute('aria-selected')).toBe('true')
})

it.each(['Enter', ' '])('activates a focused tab with %s', (key) => {
  render(<TabsHarness />)
  const designTab = screen.getByRole('tab', { name: /Design/ })

  designTab.focus()
  fireEvent.keyDown(designTab, { key })

  expect(designTab.getAttribute('aria-selected')).toBe('true')
})
```

- [ ] **Step 4: Implement the minimal controlled tab component**

Create `src/apps/qr-generator/QrBuilderTabs.jsx`:

```jsx
import { useRef } from 'react'

const TABS = [
  {
    id: 'build',
    number: '01',
    eyebrow: 'Content and details',
    label: 'Build QR',
  },
  {
    id: 'design',
    number: '02',
    eyebrow: 'Make it yours',
    label: 'Design',
  },
]

export default function QrBuilderTabs({ activeTab, onChange }) {
  const tabRefs = useRef([])

  const activate = (index, moveFocus = false) => {
    const nextTab = TABS[index]
    onChange(nextTab.id)
    if (moveFocus) {
      tabRefs.current[index]?.focus()
    }
  }

  const handleKeyDown = (event, index) => {
    let nextIndex = null

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate(index)
      return
    }

    if (nextIndex !== null) {
      event.preventDefault()
      activate(nextIndex, true)
    }
  }

  return (
    <div
      aria-label="QR builder sections"
      className="qr-builder-tabs"
      role="tablist"
    >
      {TABS.map((tab, index) => {
        const selected = activeTab === tab.id
        return (
          <button
            aria-controls={`qr-panel-${tab.id}`}
            aria-selected={selected}
            className="qr-builder-tab"
            id={`qr-tab-${tab.id}`}
            key={tab.id}
            onClick={() => activate(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" className="qr-builder-tab__number">
              {tab.number}
            </span>
            <span className="qr-builder-tab__copy">
              <small>{tab.eyebrow}</small>
              <strong>{tab.label}</strong>
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Run the component tests**

Run: `npx vitest run src/apps/qr-generator/QrBuilderTabs.test.jsx`

Expected: 4 parameter-expanded tests PASS.

- [ ] **Step 6: Commit the independently tested tab control**

```powershell
git add -- src/apps/qr-generator/QrBuilderTabs.jsx src/apps/qr-generator/QrBuilderTabs.test.jsx
git commit -m "feat: add accessible qr builder tabs"
```

### Task 2: Tabbed QR Workspace Integration

**Files:**
- Modify: `src/apps/qr-generator/QrGeneratorPage.jsx:2-6,35-46,241-283`
- Modify: `src/apps/qr-generator/QrGeneratorPage.test.jsx:56-160`

**Interfaces:**
- Consumes: `QrBuilderTabs({ activeTab, onChange })` from Task 1.
- Produces: two mounted tab panels with ids `qr-panel-build` and `qr-panel-design`; leaves the `qr-proof` aside outside the panels.

- [ ] **Step 1: Write a failing visibility and preview-persistence integration test**

Add this test at the start of `describe('QrGeneratorPage content flow', ...)`:

```jsx
it('shows one builder panel at a time while keeping the preview available', () => {
  renderPage()

  const buildTab = screen.getByRole('tab', { name: /Build QR/ })
  const designTab = screen.getByRole('tab', { name: /Design/ })
  const buildPanel = screen.getByRole('tabpanel', { name: /Build QR/ })

  expect(buildTab.getAttribute('aria-selected')).toBe('true')
  expect(buildPanel.hidden).toBe(false)
  expect(screen.getByRole('complementary', { name: 'QR preview and export' }))
    .toBeTruthy()

  fireEvent.click(designTab)

  const designPanel = screen.getByRole('tabpanel', { name: /Design/ })
  expect(designPanel.hidden).toBe(false)
  expect(document.getElementById('qr-panel-build').hidden).toBe(true)
  expect(screen.getByRole('complementary', { name: 'QR preview and export' }))
    .toBeTruthy()
})
```

- [ ] **Step 2: Write a failing cross-tab state-preservation test**

Add this test after the visibility test:

```jsx
it('preserves content and design values while switching tabs', () => {
  renderPage()

  fireEvent.change(screen.getByLabelText('Website URL'), {
    target: { value: 'https://arvenilo.com/tabs' },
  })
  fireEvent.click(screen.getByRole('tab', { name: /Design/ }))
  fireEvent.change(screen.getByLabelText('Module color value'), {
    target: { value: '#123456' },
  })
  fireEvent.click(screen.getByRole('tab', { name: /Build QR/ }))

  expect(screen.getByLabelText('Website URL').value).toBe(
    'https://arvenilo.com/tabs',
  )

  fireEvent.click(screen.getByRole('tab', { name: /Design/ }))
  expect(screen.getByLabelText('Module color value').value).toBe('#123456')
})

it('keeps the current tab selected when the QR data is reset', () => {
  renderPage()
  const designTab = screen.getByRole('tab', { name: /Design/ })

  fireEvent.click(designTab)
  fireEvent.click(screen.getByRole('button', { name: 'Reset all' }))

  expect(designTab.getAttribute('aria-selected')).toBe('true')
  expect(document.getElementById('qr-panel-design').hidden).toBe(false)
})
```

- [ ] **Step 3: Run the two integration tests to verify they fail**

Run: `npx vitest run src/apps/qr-generator/QrGeneratorPage.test.jsx -t "builder panel|switching tabs|current tab"`

Expected: FAIL because no elements have the `tab` or `tabpanel` roles.

- [ ] **Step 4: Integrate the controlled tabs and mounted panels**

In `QrGeneratorPage.jsx`:

```jsx
import QrBuilderTabs from './QrBuilderTabs.jsx'
```

Add beside the existing state declarations:

```jsx
const [activeTab, setActiveTab] = useState('build')
```

Replace the current `qr-builder` section with:

```jsx
<section className="qr-builder" aria-label="QR content and design">
  <QrBuilderTabs activeTab={activeTab} onChange={setActiveTab} />

  <div
    aria-labelledby="qr-tab-build"
    className="qr-panel qr-panel--build"
    hidden={activeTab !== 'build'}
    id="qr-panel-build"
    role="tabpanel"
  >
    <div className="qr-panel__heading">
      <span>Build</span>
      <div>
        <p className="eyebrow">Content and details</p>
        <h2>Build your QR</h2>
        <p>Start with a quick pick or choose any supported QR type.</p>
      </div>
    </div>
    <QrTypePicker
      onChange={handleTypeChange}
      selectedType={selectedType}
    />
    <QrContentForm
      errors={errors}
      onChange={handleFieldChange}
      type={selectedType}
      values={values}
    />
  </div>

  <div
    aria-labelledby="qr-tab-design"
    className="qr-panel qr-panel--design"
    hidden={activeTab !== 'design'}
    id="qr-panel-design"
    role="tabpanel"
  >
    <div className="qr-panel__heading">
      <span>Design</span>
      <div>
        <p className="eyebrow">Make it yours</p>
        <h2>Style and scan settings</h2>
      </div>
    </div>
    <QrDesignControls
      design={design}
      logoError={logoError}
      logoName={logoName}
      onChange={handleDesignChange}
      onLogo={handleLogo}
      onRemoveLogo={removeLogo}
    />
  </div>
</section>
```

Do not move or wrap the following `qr-proof` aside.

- [ ] **Step 5: Update existing design-flow tests to select the Design tab**

At the start of each test that interacts with `QrDesignControls`, after `renderPage(...)`, add:

```jsx
fireEvent.click(screen.getByRole('tab', { name: /Design/ }))
```

Apply this to:

- `updates renderer design options and reports risky contrast`
- `processes a local logo, recommends high correction, and removes it`
- `surfaces logo-processing failures without losing the QR`

Tests for export and full-size preview do not switch tabs because those controls remain in the always-visible preview.

In `processes a local logo, recommends high correction, and removes it`, verify mounted-panel preservation before removing the logo:

```jsx
fireEvent.click(screen.getByRole('tab', { name: /Build QR/ }))
fireEvent.click(screen.getByRole('tab', { name: /Design/ }))
expect(screen.getByText('mark.png')).toBeTruthy()
```

- [ ] **Step 6: Run page and tab tests**

Run: `npx vitest run src/apps/qr-generator/QrBuilderTabs.test.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the mounted-panel integration**

```powershell
git add -- src/apps/qr-generator/QrGeneratorPage.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx
git commit -m "feat: place qr controls in tabs"
```

### Task 3: Connected Responsive Tab Styling

**Files:**
- Modify: `src/apps/qr-generator/QrGeneratorPage.css:53-129,259-269,384-407,927-1021`

**Interfaces:**
- Consumes: `.qr-builder-tabs`, `.qr-builder-tab`, `.qr-builder-tab__number`, `.qr-builder-tab__copy`, `.qr-panel`, and the `hidden` attribute from Tasks 1 and 2.
- Produces: one shared builder card with connected desktop tabs and compact equal-width mobile tabs.

- [ ] **Step 1: Replace separate panel-card styling with one shared builder card**

Change the layout selectors to:

```css
.qr-builder {
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
  border-radius: var(--radius-stage);
  box-shadow: 0 1.25rem 3rem rgb(2 10 12 / 8%);
  min-width: 0;
  overflow: hidden;
}

.qr-proof__sticky {
  border: 1px solid var(--theme-border);
  border-radius: var(--radius-stage);
  box-shadow: 0 1.25rem 3rem rgb(2 10 12 / 8%);
}

.qr-panel {
  background: var(--theme-surface);
}

.qr-panel[hidden] {
  display: none;
}
```

- [ ] **Step 2: Add connected tab styles above the panel-heading rules**

```css
.qr-builder-tabs {
  background: var(--theme-form-surface);
  border-bottom: 1px solid var(--theme-border);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.qr-builder-tab {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--theme-text-secondary);
  cursor: pointer;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 2.7rem minmax(0, 1fr);
  min-height: 5.5rem;
  padding: var(--space-4) clamp(1rem, 2.4vw, 1.5rem);
  text-align: left;
}

.qr-builder-tab + .qr-builder-tab {
  border-left: 1px solid var(--theme-border);
}

.qr-builder-tab[aria-selected="true"] {
  background: var(--theme-surface);
  color: var(--theme-text);
  box-shadow: inset 0 3px 0 var(--theme-accent-text);
}

.qr-builder-tab:focus-visible {
  outline: 3px solid var(--color-digital-violet);
  outline-offset: -4px;
}

.qr-builder-tab__number {
  align-items: center;
  background: var(--color-spatial-ink);
  border-radius: 50%;
  color: var(--color-signal-mint);
  display: flex;
  font-family: var(--font-utility);
  font-size: 0.72rem;
  height: 2.7rem;
  justify-content: center;
  letter-spacing: 0.04em;
  width: 2.7rem;
}

.qr-builder-tab__copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.qr-builder-tab__copy small {
  font-family: var(--font-utility);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.qr-builder-tab__copy strong {
  color: inherit;
  font-size: 1rem;
}
```

- [ ] **Step 3: Simplify panel-heading selectors and remove obsolete details rules**

- Keep `.qr-panel__heading` and its descendant rules.
- Remove every `.qr-panel--design > summary` selector.
- Remove the obsolete details-marker, plus/minus, and `[open]` rules.
- Keep the existing `01` and `02` heading marker rules by changing the design marker selector to `.qr-panel--design .qr-panel__heading > span::before`.
- Ensure `.qr-panel--build .qr-content-form` retains its top border.

- [ ] **Step 4: Add compact mobile tab behavior**

Inside `@media (max-width: 620px)` add:

```css
.qr-builder-tab {
  gap: var(--space-2);
  grid-template-columns: 2.35rem minmax(0, 1fr);
  min-height: 4.5rem;
  padding: var(--space-3);
}

.qr-builder-tab__number {
  height: 2.35rem;
  width: 2.35rem;
}

.qr-builder-tab__copy small {
  display: none;
}
```

Update the mobile radius rule so `.qr-builder` replaces `.qr-panel`, while `.qr-proof__sticky` and `.qr-dialog` remain unchanged.

Inside `@media (max-width: 420px)`, keep compact panel heading and content padding rules but remove obsolete summary selectors.

- [ ] **Step 5: Run formatting checks, focused tests, full tests, lint, and build**

Run:

```powershell
git diff --check
npx vitest run src/apps/qr-generator/QrBuilderTabs.test.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx
npm run test:run
npm run lint
npm run build
```

Expected:

- `git diff --check`: exit 0.
- focused tests: all PASS.
- full test suite: 0 failures.
- lint: exit 0 with 0 errors.
- production build: exit 0.

- [ ] **Step 6: Verify desktop and mobile behavior in a real browser**

Run `npm run dev -- --host 127.0.0.1`, then inspect `/Productivity-Apps/qr-generator` at:

- Desktop: 1440 x 1000.
- Mobile: 390 x 844.

Verify:

- exactly two equal-width tabs appear;
- Build QR is initially selected;
- only one panel occupies space at a time;
- switching tabs preserves URL and module color values;
- keyboard focus is visible and Arrow/Home/End navigation works;
- the desktop preview remains sticky beside the workspace;
- the mobile preview remains below the workspace;
- no horizontal overflow appears at either viewport.

- [ ] **Step 7: Commit the responsive visual treatment**

```powershell
git add -- src/apps/qr-generator/QrGeneratorPage.css
git commit -m "style: compact qr builder into connected tabs"
```

### Task 4: Final Regression Review

**Files:**
- Verify: `src/apps/qr-generator/QrBuilderTabs.jsx`
- Verify: `src/apps/qr-generator/QrBuilderTabs.test.jsx`
- Verify: `src/apps/qr-generator/QrGeneratorPage.jsx`
- Verify: `src/apps/qr-generator/QrGeneratorPage.test.jsx`
- Verify: `src/apps/qr-generator/QrGeneratorPage.css`

**Interfaces:**
- Consumes: the completed tab component, mounted panels, existing QR state, and responsive styles.
- Produces: fresh release evidence and a clean feature branch ready for integration.

- [ ] **Step 1: Review the final diff against the design specification**

Run:

```powershell
git diff main...HEAD -- docs/superpowers/specs/2026-07-26-qr-builder-tabs-design.md src/apps/qr-generator
```

Confirm every in-scope requirement has a corresponding implementation or test and no preview/export or payload behavior changed.

- [ ] **Step 2: Run the complete verification suite again from the final branch state**

Run:

```powershell
npm run test:run
npm run lint
npm run build
git status --short --branch
```

Expected: tests, lint, and build exit 0; status shows only the pre-existing unrelated `.superpowers/` and `Arvenilo-Design-Handoff/` untracked folders.

- [ ] **Step 3: Record any browser screenshots needed for the handoff**

Capture one desktop and one mobile screenshot after the final build. Store them outside the repository unless the user explicitly asks to commit visual artifacts.

- [ ] **Step 4: Hand off the verified branch**

Report:

- the new two-tab behavior;
- state preservation and keyboard support;
- desktop/mobile browser results;
- exact test, lint, and build evidence;
- the unchanged unrelated untracked folders.
