# Text Comparison Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Arvenilo utility that compares prose or code by words or characters and renders additions and removals in aligned side-by-side results.

**Architecture:** A pure `diffUtils.js` module converts two strings into a serializable row-and-segment model using jsdiff. A presentational `DiffResult` renders that model, while `TextComparisonPage` owns editor state, comparison mode, validation, and actions. The existing registry supplies the home card and public route.

**Tech Stack:** React 19.2.8, Vite 8.1.5, Vitest 4.1.10, Testing Library 16.3.2, jsdiff (`diff`) 9.0.0, CSS using existing Arvenilo tokens.

## Global Constraints

- Support plain prose and code without uploading, storing, or persisting either input.
- Provide `Words` and `Characters` modes, with `Words` selected initially.
- Keep results stable until either input or the mode changes; then remove the stale result.
- Preserve whitespace in the comparison and accept no more than 100,000 JavaScript string code units per editor.
- Use Digital Violet plus text for removals and Signal Mint plus text for additions.
- Preserve aligned side-by-side output on mobile through a labeled horizontal comparison surface.
- Target WCAG 2.2 AA, visible keyboard focus, native form semantics, color-independent status, and 44px minimum controls.
- Preserve all existing JSON Formatter, Multi Link Opener, authentication, theme, and registry behavior.

---

## File Map

- Create `src/apps/text-comparison/diffUtils.js`: validate input, call jsdiff, align line groups, build segments, and count changes.
- Create `src/apps/text-comparison/diffUtils.test.js`: exercise the pure comparison model and boundaries.
- Create `src/apps/text-comparison/DiffResult.jsx`: render summary, legends, aligned rows, placeholders, and comparison seam.
- Create `src/apps/text-comparison/DiffResult.test.jsx`: verify semantic and accessible result output.
- Create `src/apps/text-comparison/TextComparisonPage.jsx`: own editor, mode, result, error, and action state.
- Create `src/apps/text-comparison/TextComparisonPage.test.jsx`: verify the complete workbench interaction.
- Create `src/apps/text-comparison/TextComparisonPage.css`: implement the responsive Arvenilo workbench.
- Modify `src/components/icons/AppIcons.jsx`: export a dedicated `CompareIcon`.
- Modify `src/config/appRegistry.jsx`: register the new public utility.
- Modify `src/config/appRegistry.test.jsx`: extend registry counts, order, metadata, and available apps.
- Modify `src/App.test.jsx`: verify the public route for a signed-out user.
- Modify `package.json` and `package-lock.json`: add `diff@9.0.0`.

---

### Task 1: Pure comparison model

**Files:**

- Create: `src/apps/text-comparison/diffUtils.js`
- Create: `src/apps/text-comparison/diffUtils.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: `diffLines`, `diffWordsWithSpace`, and `diffChars` from `diff`.
- Produces: `MAX_TEXT_LENGTH`, `DiffMode`, `DiffSegment`, `DiffSide`, `DiffRow`, `DiffResultModel`, and `compareTexts(original, revised, mode)`.
- `compareTexts` returns `{ status: 'identical' | 'different', mode, rows, addedCount, removedCount }`.
- `compareTexts` throws `RangeError('Each text must be 100,000 characters or fewer.')` for oversized input and `TypeError('Comparison mode must be words or characters.')` for an unsupported mode.

- [ ] **Step 1: Add the exact runtime dependency**

Run:

```powershell
npm install diff@9.0.0
```

Expected: `package.json` lists `"diff": "^9.0.0"` and the lockfile resolves version `9.0.0`.

- [ ] **Step 2: Write failing utility tests**

Create `src/apps/text-comparison/diffUtils.test.js` with focused tests shaped like:

```js
import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH, compareTexts } from './diffUtils.js'

describe('compareTexts', () => {
  it('returns aligned unchanged rows for identical text', () => {
    expect(compareTexts('alpha\nbeta', 'alpha\nbeta', 'words')).toEqual({
      status: 'identical',
      mode: 'words',
      rows: [
        {
          id: 'row-1',
          changed: false,
          left: { placeholder: false, segments: [{ type: 'unchanged', value: 'alpha' }] },
          right: { placeholder: false, segments: [{ type: 'unchanged', value: 'alpha' }] },
        },
        {
          id: 'row-2',
          changed: false,
          left: { placeholder: false, segments: [{ type: 'unchanged', value: 'beta' }] },
          right: { placeholder: false, segments: [{ type: 'unchanged', value: 'beta' }] },
        },
      ],
      addedCount: 0,
      removedCount: 0,
    })
  })

  it('highlights a word replacement on paired lines', () => {
    const result = compareTexts('const mode = "safe"', 'const mode = "deep"', 'words')

    expect(result.status).toBe('different')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].left.segments).toContainEqual({
      type: 'removed',
      value: 'safe',
    })
    expect(result.rows[0].right.segments).toContainEqual({
      type: 'added',
      value: 'deep',
    })
    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(1)
  })

  it('counts exact Unicode code-point changes in character mode', () => {
    const result = compareTexts('cafe', 'café🙂', 'characters')

    expect(result.removedCount).toBe(1)
    expect(result.addedCount).toBe(2)
  })

  it('aligns inserted lines with a left placeholder', () => {
    const result = compareTexts('alpha\nomega', 'alpha\nbeta\nomega', 'words')

    expect(result.rows).toContainEqual(
      expect.objectContaining({
        changed: true,
        left: { placeholder: true, segments: [] },
        right: {
          placeholder: false,
          segments: [{ type: 'added', value: 'beta' }],
        },
      }),
    )
  })

  it('rejects values above the editor limit', () => {
    expect(() =>
      compareTexts('a'.repeat(MAX_TEXT_LENGTH + 1), 'a', 'words'),
    ).toThrow('Each text must be 100,000 characters or fewer.')
  })
})
```

Continue the same test file with:

```js
it('counts punctuation replacements in Words mode', () => {
  const result = compareTexts('Ready.', 'Ready!', 'words')

  expect(result.removedCount).toBe(1)
  expect(result.addedCount).toBe(1)
})

it('counts changed whitespace in Characters mode', () => {
  const result = compareTexts('a b', 'a  b', 'characters')

  expect(result.removedCount).toBe(0)
  expect(result.addedCount).toBe(1)
})

it('aligns removed lines with right placeholders', () => {
  const result = compareTexts('alpha\nbeta\nomega', 'alpha\nomega', 'words')

  expect(result.rows).toContainEqual(
    expect.objectContaining({
      left: {
        placeholder: false,
        segments: [{ type: 'removed', value: 'beta' }],
      },
      right: { placeholder: true, segments: [] },
    }),
  )
})

it('uses placeholders for surplus lines in a replacement group', () => {
  const result = compareTexts('one\ntwo', 'first\nsecond\nthird', 'words')

  expect(result.rows).toHaveLength(3)
  expect(result.rows[2].left.placeholder).toBe(true)
  expect(result.rows[2].right.segments).toEqual([
    { type: 'added', value: 'third' },
  ])
})

it('accepts text at the exact editor limit', () => {
  const text = 'a'.repeat(MAX_TEXT_LENGTH)

  expect(compareTexts(text, text, 'characters').status).toBe('identical')
})
```

- [ ] **Step 3: Run the tests and verify the missing-module failure**

Run:

```powershell
npm test -- src/apps/text-comparison/diffUtils.test.js --run
```

Expected: FAIL because `./diffUtils.js` does not exist.

- [ ] **Step 4: Implement the comparison model**

Create `diffUtils.js` with these constants, helpers, and public function:

```js
import { diffChars, diffLines, diffWordsWithSpace } from 'diff'

export const MAX_TEXT_LENGTH = 100_000
const MODES = new Set(['words', 'characters'])

function splitChunkLines(value) {
  const withoutFinalNewline = value.endsWith('\n') ? value.slice(0, -1) : value
  return withoutFinalNewline.split('\n')
}

function changedTokenCount(value, mode) {
  if (mode === 'characters') {
    return Array.from(value).length
  }

  return (
    value.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu)?.length ?? 0
  )
}

function compareLine(leftValue, rightValue, mode) {
  const parts =
    mode === 'characters'
      ? diffChars(leftValue, rightValue)
      : diffWordsWithSpace(leftValue, rightValue)

  return {
    left: parts
      .filter((part) => !part.added)
      .map((part) => ({
        type: part.removed ? 'removed' : 'unchanged',
        value: part.value,
      })),
    right: parts
      .filter((part) => !part.removed)
      .map((part) => ({
        type: part.added ? 'added' : 'unchanged',
        value: part.value,
      })),
  }
}
```

Build rows by iterating `diffLines(original, revised, { stripTrailingCr: true })`. Convert unchanged chunks into paired unchanged rows. Buffer adjacent removed and added chunks, zip their line arrays by index, compare paired lines with `compareLine`, and create placeholders for surplus lines. Assign `row-1`, `row-2`, and subsequent ids only after alignment is complete.

Count `removed` and `added` segment values through `changedTokenCount`. Validate types, mode, and length before calling jsdiff.

- [ ] **Step 5: Run utility tests to green**

Run:

```powershell
npm test -- src/apps/text-comparison/diffUtils.test.js --run
```

Expected: all comparison-model tests pass with no warnings.

- [ ] **Step 6: Commit the comparison model**

Run:

```powershell
git add package.json package-lock.json src/apps/text-comparison/diffUtils.js src/apps/text-comparison/diffUtils.test.js
git diff --cached --check
git commit -m "feat: add text comparison engine"
```

---

### Task 2: Semantic side-by-side result

**Files:**

- Create: `src/apps/text-comparison/DiffResult.jsx`
- Create: `src/apps/text-comparison/DiffResult.test.jsx`

**Interfaces:**

- Consumes: the `DiffResultModel` shape returned by `compareTexts`.
- Produces: `DiffResult({ result })`, a presentational component with no editor state.

- [ ] **Step 1: Write failing result-renderer tests**

Create `DiffResult.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DiffResult from './DiffResult.jsx'

const differentResult = {
  status: 'different',
  mode: 'words',
  addedCount: 1,
  removedCount: 1,
  rows: [
    {
      id: 'row-1',
      changed: true,
      left: {
        placeholder: false,
        segments: [
          { type: 'unchanged', value: 'Hello ' },
          { type: 'removed', value: 'world' },
        ],
      },
      right: {
        placeholder: false,
        segments: [
          { type: 'unchanged', value: 'Hello ' },
          { type: 'added', value: 'team' },
        ],
      },
    },
  ],
}

describe('DiffResult', () => {
  it('renders summary, legends, and semantic changes', () => {
    render(<DiffResult result={differentResult} />)

    expect(screen.getByRole('heading', { name: 'Differences found' })).toBeTruthy()
    expect(screen.getByText('1 added')).toBeTruthy()
    expect(screen.getByText('1 removed')).toBeTruthy()
    expect(screen.getByText('Added')).toBeTruthy()
    expect(screen.getByText('Removed')).toBeTruthy()
    expect(screen.getByText('world').tagName).toBe('DEL')
    expect(screen.getByText('team').tagName).toBe('INS')
  })

  it('labels an empty aligned side without rendering fake text', () => {
    const result = {
      ...differentResult,
      rows: [
        {
          id: 'row-1',
          changed: true,
          left: { placeholder: true, segments: [] },
          right: {
            placeholder: false,
            segments: [{ type: 'added', value: 'new line' }],
          },
        },
      ],
    }

    render(<DiffResult result={result} />)
    expect(screen.getByLabelText('No corresponding line in Text 1')).toBeTruthy()
  })
})
```

Continue the same result test file with:

```jsx
it('announces identical input and keeps the unchanged text visible', () => {
  render(
    <DiffResult
      result={{
        status: 'identical',
        mode: 'words',
        addedCount: 0,
        removedCount: 0,
        rows: [
          {
            id: 'row-1',
            changed: false,
            left: {
              placeholder: false,
              segments: [{ type: 'unchanged', value: 'same' }],
            },
            right: {
              placeholder: false,
              segments: [{ type: 'unchanged', value: 'same' }],
            },
          },
        ],
      }}
    />,
  )

  expect(
    screen.getByRole('heading', { name: 'No differences found' }),
  ).toBeTruthy()
  expect(screen.getAllByText('same')).toHaveLength(2)
})
```

- [ ] **Step 2: Run the tests and verify the missing-component failure**

Run:

```powershell
npm test -- src/apps/text-comparison/DiffResult.test.jsx --run
```

Expected: FAIL because `DiffResult.jsx` does not exist.

- [ ] **Step 3: Implement the presentational renderer**

Use semantic `del` and `ins` elements and keep unchanged content in spans:

```jsx
function Segment({ segment }) {
  if (segment.type === 'removed') {
    return <del className="comparison-segment comparison-segment--removed">{segment.value}</del>
  }

  if (segment.type === 'added') {
    return <ins className="comparison-segment comparison-segment--added">{segment.value}</ins>
  }

  return <span>{segment.value}</span>
}

function ResultSide({ side, sideName }) {
  if (side.placeholder) {
    return (
      <span
        className="comparison-placeholder"
        aria-label={`No corresponding line in ${sideName}`}
      />
    )
  }

  return side.segments.map((segment, index) => (
    <Segment key={`${segment.type}-${index}`} segment={segment} />
  ))
}
```

Render the summary as an `aria-live="polite"` region, visible legends with swatches and labels, and each row as left cell, central seam marker, and right cell. Put the row grid inside a focusable `tabIndex="0"` container with an accessible label explaining horizontal scrolling on narrow screens.

- [ ] **Step 4: Run result tests to green**

Run:

```powershell
npm test -- src/apps/text-comparison/DiffResult.test.jsx --run
```

Expected: all renderer tests pass.

- [ ] **Step 5: Commit the result renderer**

Run:

```powershell
git add src/apps/text-comparison/DiffResult.jsx src/apps/text-comparison/DiffResult.test.jsx
git diff --cached --check
git commit -m "feat: render aligned text differences"
```

---

### Task 3: Focused comparison workbench

**Files:**

- Create: `src/apps/text-comparison/TextComparisonPage.jsx`
- Create: `src/apps/text-comparison/TextComparisonPage.test.jsx`
- Create: `src/apps/text-comparison/TextComparisonPage.css`

**Interfaces:**

- Consumes: `compareTexts`, `MAX_TEXT_LENGTH`, and `DiffResult`.
- Produces: default `TextComparisonPage`, the public route component registered in Task 4.

- [ ] **Step 1: Write failing page interaction tests**

Create `TextComparisonPage.test.jsx` with:

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH } from './diffUtils.js'
import TextComparisonPage from './TextComparisonPage.jsx'

function enterBothTexts(original = 'Hello world', revised = 'Hello team') {
  fireEvent.change(screen.getByLabelText('Text 1 / Original'), {
    target: { value: original },
  })
  fireEvent.change(screen.getByLabelText('Text 2 / Revised'), {
    target: { value: revised },
  })
}

describe('TextComparisonPage', () => {
  it('renders an accessible empty workbench with Words selected', () => {
    render(<TextComparisonPage />)

    expect(screen.getByRole('heading', { name: 'See exactly what changed.' })).toBeTruthy()
    expect(screen.getByLabelText('Text 1 / Original')).toBeTruthy()
    expect(screen.getByLabelText('Text 2 / Revised')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Words' }).checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Compare texts' }).disabled).toBe(true)
  })

  it('compares both values and clears stale output after editing', () => {
    render(<TextComparisonPage />)
    enterBothTexts()
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    expect(screen.getByRole('heading', { name: 'Differences found' })).toBeTruthy()
    expect(screen.getByText('world').tagName).toBe('DEL')
    expect(screen.getByText('team').tagName).toBe('INS')

    fireEvent.change(screen.getByLabelText('Text 2 / Revised'), {
      target: { value: 'Hello everyone' },
    })
    expect(screen.queryByRole('heading', { name: 'Differences found' })).toBeNull()
  })

  it('switches to exact character comparison', () => {
    render(<TextComparisonPage />)
    enterBothTexts('color', 'colour')
    fireEvent.click(screen.getByRole('radio', { name: 'Characters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    expect(screen.getByText('1 added')).toBeTruthy()
    expect(screen.getByText('Character comparison')).toBeTruthy()
  })

  it('clears both editors, mode, and results', () => {
    render(<TextComparisonPage />)
    enterBothTexts()
    fireEvent.click(screen.getByRole('radio', { name: 'Characters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByLabelText('Text 1 / Original').value).toBe('')
    expect(screen.getByLabelText('Text 2 / Revised').value).toBe('')
    expect(screen.getByRole('radio', { name: 'Words' }).checked).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Differences found' })).toBeNull()
  })
})
```

Continue the same page test file with:

```jsx
it('reports identical input without hiding it', () => {
  render(<TextComparisonPage />)
  enterBothTexts('same', 'same')
  fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

  expect(
    screen.getByRole('heading', { name: 'No differences found' }),
  ).toBeTruthy()
  expect(screen.getAllByText('same')).toHaveLength(2)
})

it('retains both inputs when comparison rejects an oversized value', () => {
  render(<TextComparisonPage />)
  const oversized = 'a'.repeat(MAX_TEXT_LENGTH + 1)
  enterBothTexts(oversized, 'small')
  fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

  expect(screen.getByRole('alert').textContent).toContain(
    'Your text is still here',
  )
  expect(screen.getByLabelText('Text 1 / Original').value).toBe(oversized)
  expect(screen.getByLabelText('Text 2 / Revised').value).toBe('small')
})
```

- [ ] **Step 2: Run the page tests and verify the missing-component failure**

Run:

```powershell
npm test -- src/apps/text-comparison/TextComparisonPage.test.jsx --run
```

Expected: FAIL because `TextComparisonPage.jsx` does not exist.

- [ ] **Step 3: Implement page state and actions**

Use four state values and derive button availability:

```jsx
const [original, setOriginal] = useState('')
const [revised, setRevised] = useState('')
const [mode, setMode] = useState('words')
const [result, setResult] = useState(null)
const [error, setError] = useState('')

const canCompare = original.length > 0 && revised.length > 0
const canClear = original.length > 0 || revised.length > 0 || result !== null

function invalidateResult() {
  setResult(null)
  setError('')
}

function handleCompare(event) {
  event.preventDefault()
  setError('')

  try {
    setResult(compareTexts(original, revised, mode))
  } catch {
    setResult(null)
    setError('The comparison could not be completed. Your text is still here; try again.')
  }
}
```

Use a fieldset and native radios for the mode, labeled textareas with `maxLength={MAX_TEXT_LENGTH}`, `spellCheck="false"`, `autoCapitalize="none"`, and `autoCorrect="off"`. Show line and character counts for each editor. Render `DiffResult` only when a result exists and render comparison failures with `role="alert"`.

- [ ] **Step 4: Implement the Arvenilo layout**

Create CSS for:

- `.text-comparison-page` and `.comparison-intro` using existing page spacing and headline scale;
- `.comparison-workbench` as a bordered stage;
- `.comparison-toolbar` containing the native-radio segmented control and local-only label;
- `.comparison-editors` as two columns above 800px and one column below;
- `.comparison-editor` using Interface White and Spatial Ink with an active focus border;
- `.comparison-actions` with one mint primary button and a quiet secondary action;
- `.comparison-result-grid` with `min-width: 720px`, left/right `minmax(0, 1fr)` cells, and a narrow central seam;
- violet `del` and mint `ins` treatments with underlines or edge markers in addition to color;
- dark-theme surface assignments through existing `--theme-*` variables;
- 44px controls, visible focus, reduced-motion behavior, and a mobile overflow hint.

The result rows use:

```css
.comparison-result-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.5rem minmax(0, 1fr);
}

.comparison-seam {
  align-items: center;
  display: flex;
  justify-content: center;
  position: relative;
}

.comparison-result-row--changed .comparison-seam::after {
  background: var(--color-anchor-gold);
  border: 2px solid var(--color-spatial-ink);
  border-radius: 50%;
  content: "";
  height: 0.55rem;
  width: 0.55rem;
}
```

- [ ] **Step 5: Run page and result tests to green**

Run:

```powershell
npm test -- src/apps/text-comparison/TextComparisonPage.test.jsx src/apps/text-comparison/DiffResult.test.jsx --run
```

Expected: all workbench and result tests pass without React accessibility warnings.

- [ ] **Step 6: Commit the workbench**

Run:

```powershell
git add src/apps/text-comparison/TextComparisonPage.jsx src/apps/text-comparison/TextComparisonPage.test.jsx src/apps/text-comparison/TextComparisonPage.css
git diff --cached --check
git commit -m "feat: build text comparison workbench"
```

---

### Task 4: Registry, route, and product icon

**Files:**

- Modify: `src/components/icons/AppIcons.jsx`
- Modify: `src/config/appRegistry.jsx`
- Modify: `src/config/appRegistry.test.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**

- Consumes: default `TextComparisonPage`.
- Produces: `CompareIcon` and an available public `/text-comparison` registry entry.

- [ ] **Step 1: Extend registry and route tests first**

Update the expected registry shape to six applications, three available applications, and this order:

```js
[
  'Multi Link Opener',
  'JSON Formatter',
  'Text Comparison',
  'Text Formatter',
  'Focus Timer',
  'Quick Notes',
]
```

Add:

```js
it('registers Text Comparison as a public developer utility', () => {
  expect(appRegistry[2]).toMatchObject({
    id: 'text-comparison',
    title: 'Text Comparison',
    path: '/text-comparison',
    accent: 'violet',
    category: 'Developer utility',
    status: 'available',
    requiresAuth: false,
  })
  expect(typeof appRegistry[2].component).toBe('function')
  expect(typeof appRegistry[2].icon).toBe('function')
})
```

Extend `App.test.jsx`:

```jsx
it('keeps Text Comparison public for a signed-out user', () => {
  renderAt('/text-comparison')

  expect(screen.getByLabelText('Text 1 / Original')).toBeTruthy()
  expect(screen.getByLabelText('Text 2 / Revised')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull()
})
```

- [ ] **Step 2: Run integration tests and verify the missing-registry failure**

Run:

```powershell
npm test -- src/config/appRegistry.test.jsx src/App.test.jsx --run
```

Expected: FAIL because the registry does not contain Text Comparison.

- [ ] **Step 3: Add the icon and registry entry**

Export a simple paired-text icon:

```jsx
export function CompareIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M4.5 6h6M4.5 10h4M13.5 14h6M15.5 18h4M11 7.5l2-2 2 2M13 5.5v5M13 16.5l-2 2-2-2M11 18.5v-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  )
}
```

Register:

```jsx
{
  id: 'text-comparison',
  title: 'Text Comparison',
  description:
    'Compare prose or code and trace every addition and removal side by side.',
  category: 'Developer utility',
  status: 'available',
  path: '/text-comparison',
  icon: CompareIcon,
  accent: 'violet',
  requiresAuth: false,
  component: TextComparisonPage,
}
```

- [ ] **Step 4: Run integration tests to green**

Run:

```powershell
npm test -- src/config/appRegistry.test.jsx src/App.test.jsx --run
```

Expected: registry and route tests pass.

- [ ] **Step 5: Commit app integration**

Run:

```powershell
git add src/components/icons/AppIcons.jsx src/config/appRegistry.jsx src/config/appRegistry.test.jsx src/App.test.jsx
git diff --cached --check
git commit -m "feat: publish text comparison utility"
```

---

### Task 5: Full verification and visual critique

**Files:**

- Modify only files implicated by a failing verification or confirmed visual defect.

**Interfaces:**

- Consumes: the complete registered Text Comparison feature.
- Produces: verified tests, lint, production build, and responsive browser evidence.

- [ ] **Step 1: Run all automated checks**

Run:

```powershell
npm run test:run
npm run lint
npm run build
```

Expected: all tests pass, ESLint reports no errors, and Vite completes the production build.

- [ ] **Step 2: Inspect the complete diff**

Run:

```powershell
git status --short
git diff HEAD~4 --stat
git diff --check HEAD~4
```

Expected: only the planned text-comparison, dependency, registry, route, icon, spec, and plan files are part of this feature; `.superpowers/` and `Arvenilo-Design-Handoff/` remain untracked and unstaged.

- [ ] **Step 3: Verify in a browser**

Start:

```powershell
npm run dev -- --host 127.0.0.1
```

Inspect `/text-comparison` at 1440px, 768px, and 390px in both themes. Confirm:

- editors and actions follow logical keyboard order;
- Words and Characters both change the output;
- additions and removals have labels and non-color indicators;
- the central seam aligns changed rows;
- long code scrolls without collapsing paired alignment;
- stale output disappears after editing;
- focus remains visible;
- no horizontal page overflow occurs at 390px;
- no console errors or React warnings appear.

- [ ] **Step 4: Re-run affected checks after any visual fix**

Run the exact related test file after each fix, then repeat:

```powershell
npm run test:run
npm run lint
npm run build
```

Expected: every command exits with code 0 after the final code state.

- [ ] **Step 5: Commit verified visual fixes only when needed**

If Step 3 required code changes:

```powershell
git add src/apps/text-comparison/TextComparisonPage.css src/apps/text-comparison/TextComparisonPage.jsx src/apps/text-comparison/DiffResult.jsx
git diff --cached --check
git commit -m "fix: polish text comparison responsiveness"
```

If no changes were required, do not create an empty commit.
