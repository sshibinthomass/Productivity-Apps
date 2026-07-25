# Conservative Link Preprocessing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean common copy-and-paste artifacts, reject unsafe or malformed links with specific reasons, enforce safe input limits, and visibly report every normalization.

**Architecture:** Keep all deterministic cleanup and validation in `linkUtils.js`, where `parseLinks` returns normalized URLs plus structured invalid and adjusted entries. The React page remains responsible for preventing tab reservation on over-limit submissions and rendering the richer result model; the existing `openLinks` delay and security behavior is unchanged.

**Tech Stack:** React 19.2.8, Vite 8.1.5, Vitest 4.1.10, native `URL`, CSS, GitHub Actions/Pages

## Global Constraints

- Accept at most 100 nonblank entries; reject the entire submission when this limit is exceeded.
- Accept only HTTP and HTTPS URLs with nonblank hostnames.
- Reject links containing usernames or passwords.
- Reject normalized URLs longer than 2,048 characters.
- Remove only the approved invisible characters, one approved list marker, and one matching wrapper pair.
- Add HTTPS to protocol-relative URLs and inputs without a scheme.
- Do not guess domains or strip arbitrary punctuation.
- Preserve localhost, IP addresses, ports, queries, fragments, and internationalized domain names when native `URL` accepts them.
- Detect duplicates only after URL serialization and preserve the first occurrence.
- Report invalid entries with stable reason identifiers and adjusted entries as original-to-normalized pairs.
- Do not change delayed opening, blank-tab reservation, opener protection, routing, or the GitHub Pages base path.
- Add no runtime dependency.

---

## File Map

- `src/apps/multi-link-opener/linkUtils.js`: cleanup pipeline, validation constants, reason messages, structured parse result, and unchanged tab opening.
- `src/apps/multi-link-opener/linkUtils.test.js`: parser boundaries, normalization reports, validation reasons, compatibility cases, and unchanged opener regression tests.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`: all-or-nothing limit handling and accessible invalid/adjusted result details.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx`: result-panel rendering for limit, reason, and adjustment messages.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.css`: compact reason and adjustment lists with mobile-safe wrapping.
- `README.md`: user-facing description of cleanup, validation, and limits.

---

### Task 1: Preprocess and Classify Link Entries

**Files:**
- Modify: `src/apps/multi-link-opener/linkUtils.js`
- Modify: `src/apps/multi-link-opener/linkUtils.test.js`

**Interfaces:**
- Produces: `MAX_ENTRIES = 100`.
- Produces: `MAX_URL_LENGTH = 2048`.
- Produces: `INVALID_REASON_MESSAGES`, an object mapping stable identifiers to display text.
- Preserves: `normalizeUrl(value): string`.
- Produces: `parseLinks(value): { validUrls: string[], invalidEntries: { value: string, reason: string }[], adjustedEntries: { original: string, normalized: string }[], duplicateCount: number, entryCount: number, limitError: string | null }`.
- Preserves unchanged: `openLinks(urls, options?): { openedCount: number, blockedCount: number }`.

- [ ] **Step 1: Write failing cleanup and normalization-report tests**

Add table-driven tests that prove the approved cleanup order and serialized output:

```js
it.each([
  ['\u200Bexample.com\u2060', 'https://example.com/'],
  ['- example.com/docs', 'https://example.com/docs'],
  ['* https://example.com', 'https://example.com/'],
  ['\u2022 example.com', 'https://example.com/'],
  ['"example.com"', 'https://example.com/'],
  ["'example.com'", 'https://example.com/'],
  ['<example.com>', 'https://example.com/'],
  ['(example.com)', 'https://example.com/'],
  ['[example.com]', 'https://example.com/'],
  ['//example.com/path', 'https://example.com/path'],
])('cleans %j and reports its normalized value', (input, normalized) => {
  const result = parseLinks(input)

  expect(result.validUrls).toEqual([normalized])
  expect(result.adjustedEntries).toEqual([{ original: input, normalized }])
})
```

Add conservative-cleanup assertions proving that multiple wrappers and arbitrary trailing punctuation are not stripped:

```js
expect(parseLinks('((example.com))').validUrls).toEqual([])
expect(parseLinks('example.com,').validUrls).toEqual(['https://example.com,/'])
```

The second assertion records native `URL` behavior without pretending the comma was corrected.

- [ ] **Step 2: Write failing structured-validation tests**

Add one focused assertion per stable reason:

```js
it.each([
  ['\u200B', 'empty-after-cleanup'],
  ['person@example.com', 'email-address'],
  ['example.com/a path', 'internal-whitespace'],
  ['ftp://example.com', 'unsupported-protocol'],
  ['https://user:secret@example.com', 'credentials'],
  ['https://', 'invalid-url'],
])('classifies %j as %s', (value, reason) => {
  expect(parseLinks(value).invalidEntries).toEqual([{ value, reason }])
})
```

Add an exact length-boundary test:

```js
const prefix = 'https://example.com/'
const atLimit = `${prefix}${'a'.repeat(MAX_URL_LENGTH - prefix.length)}`
const overLimit = `${atLimit}a`

expect(parseLinks(atLimit).validUrls).toEqual([atLimit])
expect(parseLinks(overLimit).invalidEntries).toEqual([
  { value: overLimit, reason: 'too-long' },
])
```

Update the existing malformed-input test to expect objects rather than strings. Update the whitespace-only result to include:

```js
adjustedEntries: [],
limitError: null,
```

- [ ] **Step 3: Write failing limit, duplicate, and compatibility tests**

Use exactly 100 and 101 generated lines:

```js
const oneHundred = Array.from(
  { length: 100 },
  (_, index) => `https://example.com/${index}`,
).join('\n')
const oneHundredAndOne = `${oneHundred}\nhttps://example.com/100`

expect(parseLinks(oneHundred)).toMatchObject({
  entryCount: 100,
  limitError: null,
})
expect(parseLinks(oneHundred).validUrls).toHaveLength(100)
expect(parseLinks(oneHundredAndOne)).toEqual({
  validUrls: [],
  invalidEntries: [],
  adjustedEntries: [],
  duplicateCount: 0,
  entryCount: 101,
  limitError: 'You can open up to 100 links at a time.',
})
```

Extend duplicate coverage so `google.com`, `https://google.com`, and
`GOOGLE.com` still produce one URL and two duplicates, while adjustments are
reported for every original that serializes differently.

Add accepted-input cases:

```js
it.each([
  ['localhost:3000/path', 'https://localhost:3000/path'],
  ['127.0.0.1:8080', 'https://127.0.0.1:8080/'],
  ['example.com:8443/docs', 'https://example.com:8443/docs'],
  ['http://[::1]:3000', 'http://[::1]:3000/'],
  ['example.com/search?q=one#result', 'https://example.com/search?q=one#result'],
  ['https://münich.example', 'https://xn--mnich-kva.example/'],
])('preserves supported address forms', (input, expected) => {
  expect(parseLinks(input).validUrls).toEqual([expected])
})
```

- [ ] **Step 4: Run the focused tests and verify failure**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js
```

Expected: FAIL because invalid entries are strings, adjustment and limit fields
do not exist, wrappers/protocol-relative values are not cleaned, and email or
credential inputs are not classified.

- [ ] **Step 5: Implement constants, cleanup helpers, and reason messages**

Add:

```js
export const MAX_ENTRIES = 100
export const MAX_URL_LENGTH = 2048

export const INVALID_REASON_MESSAGES = {
  'empty-after-cleanup': 'Nothing remains after cleanup.',
  'email-address': 'This looks like an email address, not a web link.',
  'internal-whitespace': 'Web links cannot contain spaces.',
  'unsupported-protocol': 'Only HTTP and HTTPS links are supported.',
  credentials: 'Links containing a username or password are not allowed.',
  'too-long': 'This link exceeds the 2,048-character limit.',
  'invalid-url': 'This is not a valid web address.',
}

const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g
const LIST_MARKER = /^[-*\u2022]\s+/
const SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const EMAIL_ADDRESS = /^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/
const HOST_WITH_PORT =
  /^(?:localhost|(?:[^/:]+\.)+[^/:]+|\d{1,3}(?:\.\d{1,3}){3}|\[[^\]]+\]):\d+(?:[/?#]|$)/i
const WRAPPERS = new Map([
  ['"', '"'],
  ["'", "'"],
  ['<', '>'],
  ['(', ')'],
  ['[', ']'],
])
```

Implement a private `cleanEntry(value)` that removes invisible characters,
removes `LIST_MARKER` once, trims, unwraps one matching `WRAPPERS` pair, and
trims again.

Update `normalizeUrl` so a value starting with `//` becomes
`https:${value}`. Check `HOST_WITH_PORT` before `SCHEME` so
`localhost:3000`, `example.com:8443`, and address literals with ports receive
`https://` rather than being mistaken for custom schemes. Retain other
existing schemes for validation and prepend `https://` when neither pattern
matches.

- [ ] **Step 6: Implement the structured parser**

Build nonblank trimmed entries first. When `entries.length > MAX_ENTRIES`,
return the exact empty result and limit message from Step 3.

Use a local helper:

```js
const reject = (value, reason) => {
  invalidEntries.push({ value, reason })
}
```

For each original entry:

1. Run `cleanEntry`.
2. Reject an empty result, email shape, or internal whitespace in that order.
3. Normalize and parse with `new URL`.
4. Reject an unsupported parsed protocol, missing hostname, username/password, or serialized length over `MAX_URL_LENGTH`.
5. Add `{ original, normalized: serializedUrl }` to `adjustedEntries` when `serializedUrl !== original`.
6. Count a serialized duplicate and skip adding it to `validUrls`; otherwise preserve it.

Return every field in the declared interface with `limitError: null`.

- [ ] **Step 7: Run parser and opener regression tests**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js
```

Expected: all parser tests and every existing delayed-opening/security test
pass.

- [ ] **Step 8: Commit the parser unit**

```bash
git add src/apps/multi-link-opener/linkUtils.js src/apps/multi-link-opener/linkUtils.test.js
git commit -m "feat: preprocess and validate pasted links"
```

---

### Task 2: Prevent Over-Limit Opens and Explain Parser Results

**Files:**
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: `parseLinks` and `INVALID_REASON_MESSAGES` from Task 1.
- Produces: exported `ResultPanel({ result })` for focused static-render tests.
- Preserves: the existing delay input, `openLinks` options, result counts, and page route.

- [ ] **Step 1: Write failing result-panel rendering tests**

Export `ResultPanel` from the page module in the test import, then render it
with a complete fixture:

```jsx
const result = {
  validUrls: ['https://example.com/'],
  invalidEntries: [
    { value: 'person@example.com', reason: 'email-address' },
  ],
  adjustedEntries: [
    { original: 'example.com', normalized: 'https://example.com/' },
  ],
  duplicateCount: 0,
  entryCount: 2,
  limitError: null,
  openedCount: 1,
  blockedCount: 0,
  delaySeconds: 0,
}

const markup = renderToStaticMarkup(<ResultPanel result={result} />)
expect(markup).toContain('person@example.com')
expect(markup).toContain('This looks like an email address, not a web link.')
expect(markup).toContain('Adjusted 1 link')
expect(markup).toContain('example.com')
expect(markup).toContain('https://example.com/')
expect(markup).toContain('<details')
```

Add an over-limit fixture with `limitError` and zero opened tabs. Assert the
exact limit message is visible and the panel uses its warning state.

- [ ] **Step 2: Run the page test and verify failure**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx
```

Expected: FAIL because `ResultPanel` is not exported and does not understand
structured invalid entries, adjustment details, or the limit error.

- [ ] **Step 3: Prevent tab reservation after a limit error**

Import `INVALID_REASON_MESSAGES`. In `handleSubmit`, replace the unconditional
`openLinks` call with:

```js
const opened = parsed.limitError
  ? { openedCount: 0, blockedCount: 0 }
  : openLinks(parsed.validUrls, {
      delayMs: normalizedDelay * 1000,
    })
```

This guarantees that a 101-entry submission calls neither `window.open` nor
the scheduler.

- [ ] **Step 4: Render specific invalid reasons and the limit message**

Export `ResultPanel`. Include `result.limitError` in `hasIssues`, then render
the message before other issue details:

```jsx
{result.limitError && <p className="limit-error">{result.limitError}</p>}
```

Replace the invalid list item body with:

```jsx
<>
  <code>{entry.value}</code>
  <span>{INVALID_REASON_MESSAGES[entry.reason]}</span>
</>
```

Use `${entry.value}-${entry.reason}-${index}` as the key. Unknown identifiers
must fall back to `INVALID_REASON_MESSAGES['invalid-url']`.

- [ ] **Step 5: Render adjusted entries in a disclosure**

When `adjustedEntries.length > 0`, render:

```jsx
<details className="adjusted-links">
  <summary>
    Adjusted {result.adjustedEntries.length}{' '}
    {result.adjustedEntries.length === 1 ? 'link' : 'links'}
  </summary>
  <ul>
    {result.adjustedEntries.map((entry, index) => (
      <li key={`${entry.original}-${entry.normalized}-${index}`}>
        <code>{entry.original}</code>
        <span aria-hidden="true">-&gt;</span>
        <code>{entry.normalized}</code>
      </li>
    ))}
  </ul>
</details>
```

Keep the disclosure visible for duplicate adjustments as specified, and keep
all current opened, scheduled, blocked, invalid, and duplicate messages.

- [ ] **Step 6: Style reason and adjustment details**

Make `.invalid-links code` and `.adjusted-links code` use the utility font and
`overflow-wrap: anywhere`. Display each invalid item as a small grid with the
link and reason on separate lines. Style the disclosure summary as a clear
click target with violet text and `cursor: pointer`.

For `.adjusted-links li`, use a three-column grid on wide screens:

```css
grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
```

Inside the existing 520-pixel media query, switch adjusted rows to one column
so both original and normalized URLs remain readable without horizontal
scrolling.

- [ ] **Step 7: Update user documentation**

Add a concise README paragraph stating:

```text
The opener removes common list markers, wrappers, and invisible copy-paste
characters, reports every adjusted or invalid entry, and accepts up to 100
HTTP/HTTPS links per submission. It never guesses a misspelled domain.
```

- [ ] **Step 8: Run focused and full tests**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx
npm run test:run
```

Expected: all result-panel, parser, routing, and opening tests pass.

- [ ] **Step 9: Commit the UI unit**

```bash
git add README.md src/apps/multi-link-opener/MultiLinkOpenerPage.jsx src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx src/apps/multi-link-opener/MultiLinkOpenerPage.css
git commit -m "feat: explain link cleanup results"
```

---

### Task 3: Verify and Publish the GitHub Pages Build

**Files:**
- Verify: all tracked project files
- No source file should change unless verification finds a defect.

**Interfaces:**
- Consumes: the parser and UI from Tasks 1 and 2.
- Produces: a verified `main` commit deployed by the existing `Deploy to GitHub Pages` workflow.

- [ ] **Step 1: Run repository verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits zero, and Vite creates the production
bundle without errors.

- [ ] **Step 2: Inspect the production app locally**

Serve the production bundle with `npm run preview -- --host 127.0.0.1`, then
use a real browser at desktop and mobile widths to verify:

- wrappers and list markers appear in the adjustment disclosure
- each rejection shows its specific reason
- 101 nonblank entries open no tabs
- valid links still open immediately or at the configured delay
- the nested `/Productivity-Apps/multi-link-opener` route renders
- no console errors appear

- [ ] **Step 3: Verify the final diff and repository state**

Run:

```bash
git diff --check
git status --short --branch
git log --oneline -5
```

Expected: no whitespace errors, no uncommitted files, and the two feature
commits appear after the design and plan commits.

- [ ] **Step 4: Push main and monitor deployment**

Run:

```bash
git push origin main
gh run list --workflow "Deploy to GitHub Pages" --limit 1
gh run watch <run-id> --exit-status
```

Expected: the push succeeds and both GitHub Pages workflow jobs complete
successfully.

- [ ] **Step 5: Verify the live route**

Load:

```text
https://sshibinthomass.github.io/Productivity-Apps/multi-link-opener
```

Confirm the adjustment disclosure, specific invalid reason, 100-entry limit,
existing delay control, responsive layout, and absence of console errors.

---

## Final Verification

- [ ] `npm run test:run` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] Parser accepts all approved compatibility cases.
- [ ] Parser reports every approved rejection reason.
- [ ] A 101-entry submission reserves zero tabs.
- [ ] Delayed opening and popup security tests remain unchanged and pass.
- [ ] `git status --short --branch` is clean and aligned with `origin/main`.
- [ ] GitHub Pages deployment succeeds.
- [ ] The live nested route shows the new preprocessing feedback.
