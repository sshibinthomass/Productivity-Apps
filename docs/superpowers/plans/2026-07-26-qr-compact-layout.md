# Compact QR Generator Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long QR-purpose catalog with a compact quick-pick and categorized-select interface inside the details panel on desktop and mobile.

**Architecture:** Add a focused `QrTypePicker` component that renders four quick cards and the complete grouped select from `QR_TYPES`. `QrGeneratorPage` remains the single owner of selected-type and payload state, combines the picker and fields in one build panel, and sends both controls through one type-change handler. Existing payload, rendering, safety, and export modules remain unchanged.

**Tech Stack:** React 19, JSX, CSS media queries, Vitest 4, Testing Library, Vite 8, Playwright CLI

## Global Constraints

- Quick picks are Website URL, Plain text, Contact card, and Wi-Fi.
- Every one of the 18 existing QR types remains available in the categorized `All QR types` select.
- Quick cards and the select update the same `selectedType` state.
- Values entered for a type survive switching through either interaction path.
- Active quick cards retain `aria-pressed`; the select retains a visible label.
- Minimum touch targets remain 44 pixels and existing focus, dark-mode, and reduced-motion behavior remain intact.
- At 390 × 844, the empty-state preview begins before 1,500 pixels and the document has no horizontal overflow.
- The existing 900-pixel sticky-preview breakpoint remains unchanged.
- Do not modify `.github/workflows/deploy-pages.yml`, `.superpowers/`, or `Arvenilo-Design-Handoff/`.

## File map

- Create `src/apps/qr-generator/QrTypePicker.jsx`: quick cards, grouped select, and active-type summary.
- Create `src/apps/qr-generator/QrTypePicker.test.jsx`: picker rendering, accessibility, grouping, and interaction contract.
- Modify `src/apps/qr-generator/QrGeneratorPage.jsx`: shared type-change handler and combined build panel.
- Modify `src/apps/qr-generator/QrGeneratorPage.test.jsx`: integration and state-preservation coverage.
- Modify `src/apps/qr-generator/QrGeneratorPage.css`: compact desktop/mobile layout and responsive spacing.

---

### Task 1: Create the compact type picker

**Files:**
- Create: `src/apps/qr-generator/QrTypePicker.jsx`
- Create: `src/apps/qr-generator/QrTypePicker.test.jsx`

**Interfaces:**
- Consumes: `QR_TYPES` entries shaped as `{ id, category, label, description }`
- Produces: `QrTypePicker({ selectedType: string, onChange: (type: string) => void })`
- Exposes: a `group` named `Quick picks`, four `button` elements with `aria-pressed`, a visible `All QR types` label, and one `status` summary

- [ ] **Step 1: Write the failing picker contract test**

```jsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QR_TYPES } from './qrPayloads.js'
import QrTypePicker from './QrTypePicker.jsx'

describe('QrTypePicker', () => {
  it('offers four quick picks and every QR type in one categorized select', () => {
    const onChange = vi.fn()
    render(<QrTypePicker selectedType="url" onChange={onChange} />)

    const quickPicks = screen.getByRole('group', { name: 'Quick picks' })
    const quickButtons = within(quickPicks).getAllByRole('button')
    expect(quickButtons).toHaveLength(4)
    expect(
      within(quickPicks)
        .getByRole('button', { name: /Website URL/ })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    const typeSelect = screen.getByLabelText('All QR types')
    expect(within(typeSelect).getAllByRole('option')).toHaveLength(
      QR_TYPES.length,
    )

    fireEvent.click(
      within(quickPicks).getByRole('button', { name: /Wi-Fi/ }),
    )
    expect(onChange).toHaveBeenLastCalledWith('wifi')

    fireEvent.change(typeSelect, { target: { value: 'event' } })
    expect(onChange).toHaveBeenLastCalledWith('event')
  })

  it('shows a non-quick selection without pressing a quick card', () => {
    render(<QrTypePicker selectedType="event" onChange={vi.fn()} />)

    expect(screen.getByLabelText('All QR types').value).toBe('event')
    expect(
      within(screen.getByRole('group', { name: 'Quick picks' }))
        .getAllByRole('button')
        .every((button) => button.getAttribute('aria-pressed') === 'false'),
    ).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Calendar event')
    expect(screen.getByRole('status').textContent).toContain('Place & time')
  })
})
```

- [ ] **Step 2: Run the picker test and verify the missing component is the failure**

Run:

```bash
npx vitest run src/apps/qr-generator/QrTypePicker.test.jsx
```

Expected: FAIL because `./QrTypePicker.jsx` does not exist.

- [ ] **Step 3: Implement the picker with one change callback**

```jsx
import { QR_TYPES } from './qrPayloads.js'

const QUICK_TYPE_IDS = ['url', 'text', 'vcard', 'wifi']

function groupTypes(types) {
  return types.reduce((groups, type) => {
    const existingGroup = groups.find(
      ({ category }) => category === type.category,
    )

    if (existingGroup) {
      existingGroup.types.push(type)
    } else {
      groups.push({ category: type.category, types: [type] })
    }

    return groups
  }, [])
}

export default function QrTypePicker({ selectedType, onChange }) {
  const quickTypes = QUICK_TYPE_IDS.map((id) =>
    QR_TYPES.find((type) => type.id === id),
  )
  const groups = groupTypes(QR_TYPES)
  const selected =
    QR_TYPES.find((type) => type.id === selectedType) ?? QR_TYPES[0]

  return (
    <div className="qr-type-picker">
      <div>
        <p className="qr-type-picker__label">Quick picks</p>
        <div
          aria-label="Quick picks"
          className="qr-type-picker__quick"
          role="group"
        >
          {quickTypes.map((type) => (
            <button
              aria-pressed={selected.id === type.id}
              className="qr-type-button"
              key={type.id}
              onClick={() => onChange(type.id)}
              type="button"
            >
              <span>{type.label}</span>
              <small>{type.description}</small>
            </button>
          ))}
        </div>
      </div>

      <label className="qr-type-picker__select" htmlFor="qr-type-select">
        <span>All QR types</span>
        <select
          id="qr-type-select"
          onChange={(event) => onChange(event.target.value)}
          value={selected.id}
        >
          {groups.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div aria-live="polite" className="qr-type-picker__summary" role="status">
        <p className="eyebrow">{selected.category}</p>
        <h3>{selected.label}</h3>
        <p>{selected.description}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the picker test and verify both cases pass**

Run:

```bash
npx vitest run src/apps/qr-generator/QrTypePicker.test.jsx
```

Expected: 1 file passed, 2 tests passed.

- [ ] **Step 5: Commit the picker**

```bash
git add src/apps/qr-generator/QrTypePicker.jsx src/apps/qr-generator/QrTypePicker.test.jsx
git commit -m "feat: add compact qr type picker"
```

---

### Task 2: Combine purpose selection and details

**Files:**
- Modify: `src/apps/qr-generator/QrGeneratorPage.jsx:1-320`
- Modify: `src/apps/qr-generator/QrGeneratorPage.test.jsx:1-120`
- Modify: `src/apps/qr-generator/QrGeneratorPage.css:1-260`
- Modify: `src/apps/qr-generator/QrGeneratorPage.css:847-962`

**Interfaces:**
- Consumes: `QrTypePicker({ selectedType, onChange })` from Task 1
- Produces: `handleTypeChange(type: string): void`, used by both picker paths
- Preserves: `valuesByType`, `attemptedTypes`, `feedback`, `previewError`, renderer behavior, and all export behavior

- [ ] **Step 1: Replace the existing switching test with a failing mixed-control integration test**

Add `within` to the existing Testing Library import:

```jsx
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
```

```jsx
it('preserves values while switching through quick picks and all types', () => {
  renderPage()

  fireEvent.change(screen.getByLabelText('Website URL'), {
    target: { value: 'https://arvenilo.com' },
  })

  fireEvent.change(screen.getByLabelText('All QR types'), {
    target: { value: 'event' },
  })
  expect(screen.getByLabelText('Event title')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Event title'), {
    target: { value: 'Studio launch' },
  })

  fireEvent.click(screen.getByRole('button', { name: /Website URL/ }))
  expect(screen.getByLabelText('Website URL').value).toBe(
    'https://arvenilo.com',
  )

  fireEvent.change(screen.getByLabelText('All QR types'), {
    target: { value: 'event' },
  })
  expect(screen.getByLabelText('Event title').value).toBe('Studio launch')
  expect(
    within(screen.getByRole('group', { name: 'Quick picks' }))
      .getAllByRole('button')
      .every((button) => button.getAttribute('aria-pressed') === 'false'),
  ).toBe(true)
})
```

- [ ] **Step 2: Run the page test and verify the missing select is the failure**

Run:

```bash
npx vitest run src/apps/qr-generator/QrGeneratorPage.test.jsx
```

Expected: FAIL because no control is labelled `All QR types`.

- [ ] **Step 3: Route both picker controls through one page handler**

Add the import:

```jsx
import QrTypePicker from './QrTypePicker.jsx'
```

Remove `groupedTypes()` and `TYPE_GROUPS`. Keep `currentTypeMeta()` because the
full-size preview dialog uses the active label.

Add this handler next to the existing field and design handlers:

```jsx
function handleTypeChange(type) {
  setSelectedType(type)
  setFeedback('')
  setPreviewError('')
}
```

Replace the separate `qr-panel--types` and `qr-panel--content` blocks with:

```jsx
<div className="qr-panel qr-panel--build">
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
```

Change the design badge from step `03` to step `02`; the page now has Build
and Design as its two ordered builder steps.

- [ ] **Step 4: Add compact picker and panel styles**

Remove the obsolete `.qr-type-groups`, `.qr-type-groups section`,
`.qr-type-groups h3`, and `.qr-type-grid` rules. Keep the existing
`.qr-type-button` visual treatment and add:

```css
.qr-generator-page {
  padding-block: clamp(2.25rem, 5vw, 4.5rem);
}

.qr-intro {
  margin-bottom: clamp(1.75rem, 4vw, 3rem);
}

.qr-type-picker {
  display: grid;
  gap: var(--space-5);
  padding: clamp(1.25rem, 2.8vw, 2rem);
}

.qr-type-picker__label,
.qr-type-picker__select > span {
  color: var(--theme-text-secondary);
  display: block;
  font-family: var(--font-utility);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.045em;
  margin: 0 0 var(--space-2);
  text-transform: uppercase;
}

.qr-type-picker__quick {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.qr-type-picker__quick .qr-type-button {
  min-height: 5.4rem;
}

.qr-type-picker__select select {
  background: var(--theme-form-surface);
  border: 1px solid var(--theme-border);
  border-radius: var(--radius-control);
  color: var(--theme-text-primary);
  font: inherit;
  min-height: 48px;
  padding: 0.75rem 2.75rem 0.75rem 0.9rem;
  width: 100%;
}

.qr-type-picker__summary {
  border-top: 1px solid var(--theme-border);
  padding-top: var(--space-5);
}

.qr-type-picker__summary h3 {
  font-size: clamp(1.2rem, 2vw, 1.55rem);
}

.qr-type-picker__summary > p:last-child {
  color: var(--theme-text-secondary);
  font-size: var(--text-small);
  margin: var(--space-2) 0 0;
}

.qr-panel--build .qr-content-form {
  border-top: 1px solid var(--theme-border);
}
```

At `max-width: 620px`, use:

```css
.qr-type-picker__quick {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.qr-type-picker__quick .qr-type-button {
  min-height: 3.75rem;
}
```

At `max-width: 420px`, include `.qr-type-picker` in the existing compact
padding rule and keep `.qr-type-button small { display: none; }`.

- [ ] **Step 5: Run the picker and page tests**

Run:

```bash
npx vitest run src/apps/qr-generator/QrTypePicker.test.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx
```

Expected: 2 files passed and every picker/page test passed.

- [ ] **Step 6: Commit the integrated layout**

```bash
git add src/apps/qr-generator/QrGeneratorPage.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx src/apps/qr-generator/QrGeneratorPage.css
git commit -m "feat: compact qr generator workflow"
```

---

### Task 3: Verify responsive acceptance criteria

**Files:**
- Modify if measurements require adjustment: `src/apps/qr-generator/QrGeneratorPage.css`
- Test: all files under `src/apps/qr-generator/`

**Interfaces:**
- Consumes: the combined panel and responsive CSS from Task 2
- Produces: verified 390-pixel, tablet, and desktop layouts with no payload or export regressions

- [ ] **Step 1: Start the local app in a separate terminal**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4174
```

Expected: Vite serves the branch at
`http://127.0.0.1:4174/qr-generator`.

- [ ] **Step 2: Measure the 390 × 844 layout in a real browser**

Run:

```bash
npx --yes --package @playwright/cli playwright-cli --session qr-compact open http://127.0.0.1:4174/qr-generator
npx --yes --package @playwright/cli playwright-cli --session qr-compact resize 390 844
npx --yes --package @playwright/cli playwright-cli --session qr-compact snapshot
npx --yes --package @playwright/cli playwright-cli --session qr-compact eval "({ previewTop: Math.round(document.querySelector('.qr-proof').getBoundingClientRect().top + scrollY), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, quickCards: document.querySelectorAll('.qr-type-picker__quick .qr-type-button').length })"
```

Expected: `previewTop` is below `1500`, `scrollWidth` and `clientWidth` are
both `390`, and `quickCards` is `4`.

- [ ] **Step 3: Verify tablet and desktop behavior**

Run:

```bash
npx --yes --package @playwright/cli playwright-cli --session qr-compact resize 768 1024
npx --yes --package @playwright/cli playwright-cli --session qr-compact snapshot
npx --yes --package @playwright/cli playwright-cli --session qr-compact resize 1440 1000
npx --yes --package @playwright/cli playwright-cli --session qr-compact snapshot
npx --yes --package @playwright/cli playwright-cli --session qr-compact eval "({ sticky: getComputedStyle(document.querySelector('.qr-proof__sticky')).position, columns: getComputedStyle(document.querySelector('.qr-studio')).gridTemplateColumns, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })"
```

Expected at 1440 pixels:

- `sticky` is `sticky`;
- `columns` contains two non-zero tracks;
- `overflow` is `0`.

At 768 pixels, the snapshot must show the preview after the builder in one
column. At both widths, the quick cards and `All QR types` select must be
visible.

- [ ] **Step 4: Exercise both selection paths in the mobile browser**

Use fresh snapshot references:

```bash
npx --yes --package @playwright/cli playwright-cli --session qr-compact resize 390 844
npx --yes --package @playwright/cli playwright-cli --session qr-compact snapshot
npx --yes --package @playwright/cli playwright-cli --session qr-compact run-code "await page.getByLabel('All QR types').selectOption('event')"
npx --yes --package @playwright/cli playwright-cli --session qr-compact snapshot
```

Expected: the summary reads `Calendar event`, the form exposes `Event title`,
and no quick card is pressed. Then click the fresh `Website URL` quick-card
reference and verify the `Website URL` field returns.

- [ ] **Step 5: Run the full project gates**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected:

- all Vitest files pass with zero failures;
- ESLint exits 0;
- Vite creates `dist` and exits 0.

- [ ] **Step 6: Confirm only task files are included and commit any measured CSS adjustment**

Run:

```bash
git status --short
git diff --check
```

Expected: no conflict markers or whitespace errors; the unrelated workflow
edit and untracked folders remain unstaged.

If Step 2 required a CSS adjustment, commit only that file:

```bash
git add src/apps/qr-generator/QrGeneratorPage.css
git commit -m "fix: tighten qr generator responsive layout"
```

If no adjustment was required, do not create an empty commit.
