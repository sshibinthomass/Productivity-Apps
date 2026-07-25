# Delayed Link Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a whole-second delay control that loads the first link immediately and each remaining link at the selected interval.

**Architecture:** `openLinks` performs two phases: synchronously reserve and protect every available tab, then navigate successful reservations immediately or through an injected scheduler. The React page owns the seconds input, normalizes it to the approved range, converts it to milliseconds, and renders schedule-aware feedback.

**Tech Stack:** React 19.2.8, Vitest 4.1.10 fake timers, native browser `window.open`, native `setTimeout`, CSS

## Global Constraints

- The first valid destination loads immediately.
- Each subsequent destination loads after `successful index × delay`.
- Delay is measured in whole seconds from `0` through `60`.
- Default delay is `0`.
- All blank tabs must be reserved synchronously during the original click.
- Blocked tab reservations must not be scheduled.
- Every successful tab must keep opener and no-referrer protections.
- A zero-second delay must preserve immediate navigation.
- Delay state is not persisted.
- No cancellation, pause, countdown, presets, or backend is included.

---

## File Map

- `src/apps/multi-link-opener/linkUtils.js`: two-phase tab reservation and scheduled navigation.
- `src/apps/multi-link-opener/linkUtils.test.js`: synchronous reservation, fake-timer sequencing, blocked-tab, and security tests.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`: delay input state, normalization, submit options, and result copy.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx`: accessible delay-control markup.
- `src/apps/multi-link-opener/MultiLinkOpenerPage.css`: delay-control layout and responsive styling.
- `README.md`: user-facing delay behavior.

---

### Task 1: Schedule Reserved Tab Navigation

**Files:**
- Modify: `src/apps/multi-link-opener/linkUtils.js`
- Modify: `src/apps/multi-link-opener/linkUtils.test.js`

**Interfaces:**
- Produces: `openLinks(urls, options?)`.
- `options.opener`: `(url: string, target: string) => Window | null`.
- `options.scheduler`: `(callback: Function, delayMs: number) => unknown`.
- `options.delayMs`: nonnegative delay between successful reservations.
- Returns: `{ openedCount: number, blockedCount: number }`.

- [ ] **Step 1: Update the existing protected-tab test for the options API**

Use:

```js
openLinks(['https://a.example/', 'https://b.example/'], {
  opener,
  scheduler,
  delayMs: 2000,
})
```

Assert that both calls to `opener('', '_blank')` happen before any scheduled
navigation, the first reservation navigates immediately, and the scheduler is
called once with a 2000 millisecond delay.

- [ ] **Step 2: Add failing fake-timer sequencing tests**

Create three successful window doubles with `location.replace` spies. With
Vitest fake timers and `delayMs: 2000`, assert:

```js
expect(firstReplace).toHaveBeenCalledWith('https://a.example/')
expect(secondReplace).not.toHaveBeenCalled()
expect(thirdReplace).not.toHaveBeenCalled()

vi.advanceTimersByTime(2000)
expect(secondReplace).toHaveBeenCalledWith('https://b.example/')
expect(thirdReplace).not.toHaveBeenCalled()

vi.advanceTimersByTime(2000)
expect(thirdReplace).toHaveBeenCalledWith('https://c.example/')
```

Add a zero-delay test proving every successful reservation navigates before
`openLinks` returns. Add a blocked-middle-tab test proving successful tabs use
contiguous schedule positions: first at 0 milliseconds and second successful
tab at 2000 milliseconds.

- [ ] **Step 3: Run the focused tests and verify the expected failure**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js
```

Expected: FAIL because `openLinks` still accepts a positional opener and
navigates each tab during the reservation loop.

- [ ] **Step 4: Implement two-phase reservation and navigation**

Normalize the options:

```js
export function openLinks(
  urls,
  {
    opener = window.open.bind(window),
    scheduler = window.setTimeout.bind(window),
    delayMs = 0,
  } = {},
) {
  const interval = Math.max(0, Number(delayMs) || 0)
  const reservations = []
  let blockedCount = 0
```

First loop through every URL and call `opener('', '_blank')`. For successful
tabs, apply the existing opener/referrer protection and store
`{ openedWindow, url }`; do not navigate yet.

Then loop over `reservations`. Navigate index zero immediately. When the
interval is zero, navigate every reservation immediately. Otherwise call
`scheduler(navigate, index * interval)` for indexes greater than zero.

Return `openedCount: reservations.length` and the blocked count.

- [ ] **Step 5: Run the focused and full test suites**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/linkUtils.test.js
npm run test:run
```

Expected: all tests pass with no warnings.

- [ ] **Step 6: Commit**

```bash
git add src/apps/multi-link-opener/linkUtils.js src/apps/multi-link-opener/linkUtils.test.js
git commit -m "feat: schedule delayed link navigation"
```

---

### Task 2: Delay Control, Feedback, and Deployment

**Files:**
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.jsx`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: `openLinks(urls, { delayMs })` from Task 1.
- Produces: number input `#link-delay` with `min="0"`, `max="60"`, `step="1"`, and default `0`.
- Adds `delaySeconds` to the page result object.

- [ ] **Step 1: Write the failing static-markup test**

Extend the page test with:

```js
expect(markup).toContain('for="link-delay"')
expect(markup).toContain('id="link-delay"')
expect(markup).toContain('type="number"')
expect(markup).toContain('min="0"')
expect(markup).toContain('max="60"')
expect(markup).toContain('step="1"')
expect(markup).toContain('value="0"')
expect(markup).toContain('First link opens immediately')
```

- [ ] **Step 2: Run the page test and verify failure**

Run:

```bash
npm run test:run -- src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx
```

Expected: FAIL because the delay input is absent.

- [ ] **Step 3: Add delay state and normalized submission**

Add `delaySeconds` string state with initial value `'0'`. On submit, normalize
with:

```js
const normalizedDelay = Math.min(
  60,
  Math.max(0, Math.floor(Number(delaySeconds) || 0)),
)
```

Set the input to the normalized value, call:

```js
const opened = openLinks(parsed.validUrls, {
  delayMs: normalizedDelay * 1000,
})
```

and save `delaySeconds: normalizedDelay` in the result.

- [ ] **Step 4: Add the accessible delay control and feedback**

Render a `.delay-control` block between the textarea and actions. It contains
the `#link-delay` number input, visible label, "seconds" suffix, and helper
text:

```text
First link opens immediately. Waiting tabs stay blank until their turn.
```

For more than one successful tab and a positive delay, use:

```text
<count> tabs scheduled
First link is loading now. The rest will load every <delay> seconds.
```

For zero delay or one successful tab, retain the existing opened-link message.
Keep invalid, duplicate, and blocked feedback unchanged.

- [ ] **Step 5: Style desktop and mobile layouts**

Give `.delay-control` a light paper-deep panel, a compact label/helper column,
and a right-aligned input group. The number input uses the existing utility
font, violet focus ring, and a minimum 44-pixel height. Below 520 pixels, stack
the label and input group without changing the primary action width.

- [ ] **Step 6: Update user documentation**

Update the README app description to state that links may open immediately or
at a selected whole-second interval, with the first loading immediately.

- [ ] **Step 7: Run all local verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: all tests pass, lint exits zero, and the production build succeeds.

Use a real browser at desktop and mobile widths to verify the delay control,
zero-delay behavior, two-second scheduling, blocked-tab messaging, and no
console errors.

- [ ] **Step 8: Commit**

```bash
git add README.md src/apps/multi-link-opener
git commit -m "feat: add link opening delay control"
```

- [ ] **Step 9: Push and verify deployment**

Push `main` to `origin`, monitor the `Deploy to GitHub Pages` workflow until
both build and deploy jobs succeed, then directly load:

```text
https://sshibinthomass.github.io/Productivity-Apps/multi-link-opener
```

Verify the delay input and clean nested route in a real browser.

---

## Final Verification

- [ ] `npm run test:run` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] `git status --short --branch` is clean and aligned with `origin/main`.
- [ ] GitHub Actions deployment succeeds.
- [ ] Live GitHub Pages tool route shows the delay input and has no console errors.
