# JSON Formatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Arvenilo-styled JSON Formatter with bidirectional live editing, safe and deep repairs, error locations, copying, indentation control, and a full-screen formatted editor.

**Architecture:** A pure `jsonUtils.js` module owns parsing, formatting, deterministic repairs, and repair reports. A focused React page owns the synchronized editor state and browser interactions, while the existing registry exposes the utility through the network home page and router.

**Tech Stack:** React 19, React Router 7, Vite 8, Vitest 4, Testing Library, browser Clipboard API, existing Arvenilo CSS tokens.

## Global Constraints

- Expose the public application at `/json-formatter`.
- Keep all parsing and repair work local to the browser.
- Use no external JSON editor or parser dependency.
- Preserve invalid user text; never silently discard or reinterpret ambiguous data.
- Safe fix handles comments, single quotes, unquoted keys, trailing commas, and Python literals.
- Deep fix additionally handles common missing commas and clear missing or mismatched closing delimiters.
- Both editors remain writable and synchronized without rewriting the active editor beneath the cursor.
- Full screen must preserve editing, copying, status, Escape-to-close, and focus restoration.
- Match the existing Arvenilo light and dark design system and responsive behavior.

---

### Task 1: JSON parsing, formatting, and repair engine

**Files:**
- Create: `src/apps/json-formatter/jsonUtils.js`
- Create: `src/apps/json-formatter/jsonUtils.test.js`

**Interfaces:**
- Produces: `parseJson(text, indent = 2)` returning `{ status, value, formatted, error }`.
- Produces: `repairJson(text, mode = 'safe', indent = 2)` returning `{ success, text, value, repairs, error }`.
- Produces: `JSON_SAMPLE`, a representative valid source string for the Sample action.
- Error objects use `{ message, line, column, position }`; repair entries use `{ code, message }`.

- [ ] **Step 1: Write failing parsing and formatting tests**

```js
import { describe, expect, it } from 'vitest'
import { parseJson } from './jsonUtils.js'

describe('parseJson', () => {
  it('formats valid JSON with the requested indentation', () => {
    expect(parseJson('{"name":"Arvenilo","active":true}', 4)).toMatchObject({
      status: 'valid',
      formatted:
        '{\n    "name": "Arvenilo",\n    "active": true\n}',
    })
  })

  it('returns a neutral result for blank input', () => {
    expect(parseJson(' \n ')).toEqual({
      status: 'empty',
      value: null,
      formatted: '',
      error: null,
    })
  })

  it('reports a one-based line and column for invalid JSON', () => {
    const result = parseJson('{\n  "name": "Arvenilo",\n  bad\n}')
    expect(result.status).toBe('invalid')
    expect(result.error.line).toBe(3)
    expect(result.error.column).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run: `npm test -- --run src/apps/json-formatter/jsonUtils.test.js`

Expected: FAIL because `jsonUtils.js` does not exist.

- [ ] **Step 3: Implement parsing, indentation normalization, and error locations**

```js
export function parseJson(text, indent = 2) {
  if (!text.trim()) {
    return { status: 'empty', value: null, formatted: '', error: null }
  }

  try {
    const value = JSON.parse(text)
    return {
      status: 'valid',
      value,
      formatted: JSON.stringify(value, null, normalizeIndent(indent)),
      error: null,
    }
  } catch (error) {
    return {
      status: 'invalid',
      value: null,
      formatted: '',
      error: locateJsonError(error, text),
    }
  }
}
```

`locateJsonError` extracts `position N` or `line N column N` from the runtime message, derives missing coordinates from the source, and returns a concise message with the raw engine prefix removed.

- [ ] **Step 4: Add failing safe-repair tests**

```js
it('safe-fixes comments, keys, quotes, trailing commas, and Python literals', () => {
  const source = `{
    // profile
    name: 'Arvenilo',
    active: True,
    note: None,
  }`
  const result = repairJson(source, 'safe')

  expect(result.success).toBe(true)
  expect(result.value).toEqual({
    name: 'Arvenilo',
    active: true,
    note: null,
  })
  expect(result.repairs.map(({ code }) => code)).toEqual(
    expect.arrayContaining([
      'comments',
      'single-quotes',
      'unquoted-keys',
      'python-literals',
      'trailing-commas',
    ]),
  )
})

it('does not guess a missing comma in safe mode', () => {
  expect(repairJson('{"a": 1\n"b": 2}', 'safe').success).toBe(false)
})
```

- [ ] **Step 5: Run safe-repair tests and confirm they fail**

Run: `npm test -- --run src/apps/json-formatter/jsonUtils.test.js`

Expected: FAIL because `repairJson` does not yet exist.

- [ ] **Step 6: Implement deterministic safe transformations**

Implement string-aware scanners for comments, single-quoted strings, and Python literals so quoted content is never changed. Quote keys only after `{` or `,`, and remove commas only when the next non-whitespace token is `}` or `]`. Record each transformation code once, in application order, and validate the final output with `parseJson`.

- [ ] **Step 7: Add failing deep-repair tests**

```js
it('deep-fixes common missing commas and end delimiters', () => {
  const source = `{
    "name": "Arvenilo"
    "tools": [
      "formatter"
      "opener"
  `
  const result = repairJson(source, 'deep')

  expect(result.success).toBe(true)
  expect(result.value).toEqual({
    name: 'Arvenilo',
    tools: ['formatter', 'opener'],
  })
  expect(result.repairs.map(({ code }) => code)).toEqual(
    expect.arrayContaining(['missing-commas', 'closing-delimiters']),
  )
})

it('preserves ambiguous invalid input', () => {
  const source = '{"value": one two}'
  const result = repairJson(source, 'deep')
  expect(result.success).toBe(false)
  expect(result.text).toBe(source)
})
```

- [ ] **Step 8: Run deep-repair tests and confirm they fail**

Run: `npm test -- --run src/apps/json-formatter/jsonUtils.test.js`

Expected: FAIL on the deep-repair expectations.

- [ ] **Step 9: Implement deep repair and final validation**

Use a string-aware delimiter stack to append only unclosed `}` and `]` tokens and to replace a mismatched closer only when it matches an earlier open delimiter. Insert missing commas only across line boundaries where the preceding significant token completes a JSON value and the next significant token begins a property or array value. Return the untouched source when final parsing still fails.

- [ ] **Step 10: Run the utility tests**

Run: `npm test -- --run src/apps/json-formatter/jsonUtils.test.js`

Expected: PASS.

- [ ] **Step 11: Commit the repair engine**

```bash
git add src/apps/json-formatter/jsonUtils.js src/apps/json-formatter/jsonUtils.test.js
git commit -m "feat: add json repair engine"
```

---

### Task 2: Synchronized JSON Formatter workbench

**Files:**
- Create: `src/apps/json-formatter/JsonFormatterPage.jsx`
- Create: `src/apps/json-formatter/JsonFormatterPage.test.jsx`

**Interfaces:**
- Consumes: `parseJson`, `repairJson`, and `JSON_SAMPLE` from `jsonUtils.js`.
- Produces: default `JsonFormatterPage` route component.
- Produces: accessible controls named `Input JSON`, `Formatted JSON`, `Safe fix`, `Deep fix`, `Copy JSON`, `Full screen`, `Load sample`, and `Clear`.

- [ ] **Step 1: Write failing rendering and input-synchronization tests**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import JsonFormatterPage from './JsonFormatterPage.jsx'

it('formats valid source into the formatted editor', () => {
  render(<JsonFormatterPage />)
  fireEvent.change(screen.getByLabelText('Input JSON'), {
    target: { value: '{"name":"Arvenilo"}' },
  })
  expect(screen.getByLabelText('Formatted JSON').value).toBe(
    '{\n  "name": "Arvenilo"\n}',
  )
  expect(screen.getByText('Valid JSON')).toBeTruthy()
})

it('mirrors formatted-editor edits back to input', () => {
  render(<JsonFormatterPage />)
  fireEvent.change(screen.getByLabelText('Formatted JSON'), {
    target: { value: '{"ready":true}' },
  })
  expect(screen.getByLabelText('Input JSON').value).toBe('{"ready":true}')
})
```

- [ ] **Step 2: Run the component tests and confirm the missing-module failure**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: FAIL because `JsonFormatterPage.jsx` does not exist.

- [ ] **Step 3: Implement editor state and synchronization**

Use `sourceText`, `formattedText`, `activeSide`, `indent`, `lastValidValue`, and `validation` state. Input edits preserve `sourceText` and update `formattedText` only when parsing succeeds. Formatted edits mirror their exact text to `sourceText`; parsing updates status without reformatting the active formatted editor.

- [ ] **Step 4: Add failing repair, invalid-state, and indentation tests**

```jsx
it('repairs with safe and deep actions', () => {
  render(<JsonFormatterPage />)
  const input = screen.getByLabelText('Input JSON')

  fireEvent.change(input, { target: { value: "{name: 'Arvenilo',}" } })
  fireEvent.click(screen.getByRole('button', { name: 'Safe fix' }))
  expect(JSON.parse(input.value)).toEqual({ name: 'Arvenilo' })

  fireEvent.change(input, { target: { value: '{"a": 1\n"b": 2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Deep fix' }))
  expect(JSON.parse(input.value)).toEqual({ a: 1, b: 2 })
})

it('keeps the last formatted value while input is temporarily invalid', () => {
  render(<JsonFormatterPage />)
  const input = screen.getByLabelText('Input JSON')
  const output = screen.getByLabelText('Formatted JSON')
  fireEvent.change(input, { target: { value: '{"valid":true}' } })
  const lastValid = output.value
  fireEvent.change(input, { target: { value: '{"valid":' } })
  expect(output.value).toBe(lastValid)
  expect(screen.getByText(/Line 1/i)).toBeTruthy()
})

it('reformats valid JSON when indentation changes', () => {
  render(<JsonFormatterPage />)
  fireEvent.change(screen.getByLabelText('Input JSON'), {
    target: { value: '{"nested":{"value":1}}' },
  })
  fireEvent.change(screen.getByLabelText('Indentation'), {
    target: { value: '4' },
  })
  expect(screen.getByLabelText('Formatted JSON').value).toContain(
    '    "nested"',
  )
})
```

- [ ] **Step 5: Run the expanded tests and confirm the feature failures**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: FAIL on unimplemented actions and status details.

- [ ] **Step 6: Implement repair actions, repair reports, status, line details, sample, clear, and indentation**

Repair actions call `repairJson(sourceText, mode, indent)` and replace both editors only on success. Failed repairs preserve text and show the returned error. The status region uses `role="status"` and reports Ready, Valid JSON, or `Invalid JSON · Line N, column N`. Repair messages render as a compact list.

- [ ] **Step 7: Add failing copy and full-screen tests**

```jsx
it('copies valid formatted JSON', async () => {
  const writeText = vi.fn().mockResolvedValue()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  render(<JsonFormatterPage />)
  fireEvent.change(screen.getByLabelText('Input JSON'), {
    target: { value: '{"copy":true}' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }))
  expect(writeText).toHaveBeenCalledWith('{\n  "copy": true\n}')
  expect(await screen.findByText('JSON copied')).toBeTruthy()
})

it('opens and closes the full-screen editor', () => {
  render(<JsonFormatterPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
  expect(screen.getByRole('dialog', { name: 'Formatted JSON full screen' }))
    .toBeTruthy()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
})
```

- [ ] **Step 8: Run copy and full-screen tests and confirm they fail**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: FAIL on missing Clipboard API and dialog behavior.

- [ ] **Step 9: Implement copy feedback and the full-screen dialog**

Use `navigator.clipboard.writeText(formattedText)`, disable copying without a valid document, and show success or failure feedback. Render the full-screen editor as a `role="dialog"` overlay with `aria-modal="true"`, a close button, the synchronized formatted editor, status, and copy action. Listen for Escape only while open and return focus to the Full screen trigger on close.

- [ ] **Step 10: Run component tests**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: PASS.

- [ ] **Step 11: Commit the workbench behavior**

```bash
git add src/apps/json-formatter/JsonFormatterPage.jsx src/apps/json-formatter/JsonFormatterPage.test.jsx
git commit -m "feat: build synchronized json workbench"
```

---

### Task 3: Arvenilo visual design and network registration

**Files:**
- Create: `src/apps/json-formatter/JsonFormatterPage.css`
- Modify: `src/apps/json-formatter/JsonFormatterPage.jsx`
- Modify: `src/components/icons/AppIcons.jsx`
- Modify: `src/config/appRegistry.jsx`
- Modify: `src/config/appRegistry.test.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: existing CSS custom properties from `src/styles/global.css`.
- Produces: `JsonIcon({ size })`.
- Produces: an available registry item with `id: 'json-formatter'`, `path: '/json-formatter'`, `accent: 'gold'`, `requiresAuth: false`.

- [ ] **Step 1: Update registry and route tests first**

```jsx
expect(appRegistry.map((app) => app.title)).toEqual([
  'Multi Link Opener',
  'JSON Formatter',
  'Text Formatter',
  'Focus Timer',
  'Quick Notes',
])
expect(availableApps).toHaveLength(2)
expect(availableApps[1]).toMatchObject({
  id: 'json-formatter',
  path: '/json-formatter',
  requiresAuth: false,
  status: 'available',
})
```

Add an App route test that renders `/json-formatter` and finds the `Input JSON` and `Formatted JSON` controls without showing the Google sign-in button.

- [ ] **Step 2: Run registry and route tests and confirm they fail**

Run: `npm test -- --run src/config/appRegistry.test.jsx src/App.test.jsx`

Expected: FAIL because the app is not registered.

- [ ] **Step 3: Add the icon and registry entry**

Implement `JsonIcon` using the established `IconFrame`, braces, and three small code dots. Register `JsonFormatterPage` immediately after Multi Link Opener with title `JSON Formatter`, description `Repair invalid JSON, format it clearly, and copy a clean result.`, category `Developer utility`, and public availability.

- [ ] **Step 4: Run registry and route tests**

Run: `npm test -- --run src/config/appRegistry.test.jsx src/App.test.jsx`

Expected: PASS.

- [ ] **Step 5: Implement the Arvenilo workbench stylesheet**

Create a page-specific stylesheet that:

- uses a dark spatial workbench with mint valid, gold repair, violet full-screen, and coral error signals
- creates a balanced two-column editor grid above 960px and one-column stack below it
- uses IBM Plex Mono for editors and line-location details
- gives both textareas at least 28rem height on desktop and 20rem on mobile
- visually distinguishes the active editor without relying on color alone
- makes the full-screen dialog fixed to the viewport with a readable max-width toolbar
- respects current theme tokens, visible focus, 44px controls, reduced motion, and safe mobile spacing

Import `./JsonFormatterPage.css` from the page component.

- [ ] **Step 6: Run the focused UI tests and lint**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx src/config/appRegistry.test.jsx src/App.test.jsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit the registered, styled app**

```bash
git add src/apps/json-formatter/JsonFormatterPage.css src/apps/json-formatter/JsonFormatterPage.jsx src/components/icons/AppIcons.jsx src/config/appRegistry.jsx src/config/appRegistry.test.jsx src/App.test.jsx
git commit -m "feat: add json formatter to app network"
```

---

### Task 4: Final integration verification

**Files:**
- Modify if required by observed failures: files introduced or changed in Tasks 1–3 only.

**Interfaces:**
- Consumes: the complete JSON Formatter application.
- Produces: a production-ready app with passing tests, lint, and build.

- [ ] **Step 1: Run all tests**

Run: `npm run test:run`

Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS with no errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite exits successfully and writes `dist/`.

- [ ] **Step 4: Review the final diff for scope and accessibility**

Run: `git diff HEAD~3 --check`

Expected: no whitespace errors. Confirm no unrelated files, especially `Arvenilo-Design-Handoff/`, are staged or committed.

- [ ] **Step 5: Commit verification-only fixes if any were required**

```bash
git add src/apps/json-formatter src/components/icons/AppIcons.jsx src/config/appRegistry.jsx src/config/appRegistry.test.jsx src/App.test.jsx
git commit -m "fix: finalize json formatter verification"
```
