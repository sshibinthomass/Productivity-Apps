# JSON Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add datetime-named `.json` downloads to the normal and full-screen formatted JSON views.

**Architecture:** A focused browser utility creates the local datetime filename and performs the temporary Blob URL download. The existing page receives the utility as a defaulted dependency, uses its current valid-document condition to enable the action, and reports the result through the existing feedback area.

**Tech Stack:** React 19, browser Blob and object URL APIs, Vite 8, Vitest 4, Testing Library, existing Arvenilo CSS.

## Global Constraints

- Use filenames in the exact shape `formatted-YYYY-MM-DD-HHMMSS.json`.
- Use the user's local date and time at the moment of download.
- Download the current valid formatted-editor text with MIME type `application/json`.
- Disable downloads for empty or invalid JSON.
- Expose Download JSON in both the normal and full-screen formatted views.
- Revoke every temporary object URL and remove every temporary anchor.
- Add no server request, persistent storage, or dependency.
- Preserve all existing copy, repair, synchronization, and full-screen behavior.

---

### Task 1: Datetime JSON download utility

**Files:**
- Create: `src/apps/json-formatter/downloadJson.js`
- Create: `src/apps/json-formatter/downloadJson.test.js`

**Interfaces:**
- Produces: `createJsonFilename(date: Date): string`.
- Produces: `downloadJson(text: string, options?): string`.
- `downloadJson` options are `{ date, documentRef, urlApi, BlobCtor }`, defaulting to the corresponding browser values.
- The returned string is the filename assigned to the temporary anchor.

- [ ] **Step 1: Write failing filename tests**

```js
import { describe, expect, it, vi } from 'vitest'
import { createJsonFilename, downloadJson } from './downloadJson.js'

describe('createJsonFilename', () => {
  it('uses zero-padded local datetime components', () => {
    const localDate = new Date(2026, 6, 26, 4, 5, 9)

    expect(createJsonFilename(localDate)).toBe(
      'formatted-2026-07-26-040509.json',
    )
  })
})
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `npm test -- --run src/apps/json-formatter/downloadJson.test.js`

Expected: FAIL because `downloadJson.js` does not exist.

- [ ] **Step 3: Implement the filename helper**

```js
function pad(value) {
  return String(value).padStart(2, '0')
}

export function createJsonFilename(date = new Date()) {
  return [
    `formatted-${date.getFullYear()}`,
    pad(date.getMonth() + 1),
    `${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.json`,
  ].join('-')
}
```

- [ ] **Step 4: Add failing Blob download and cleanup tests**

```js
it('downloads application/json and cleans up the temporary URL', () => {
  const click = vi.fn()
  const remove = vi.fn()
  const anchor = { click, remove, style: {} }
  const append = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:json-download')
  const revokeObjectURL = vi.fn()
  const blobs = []
  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts
      this.type = options.type
      blobs.push(this)
    }
  }

  const filename = downloadJson('{\n  "ready": true\n}', {
    date: new Date(2026, 6, 26, 14, 35, 9),
    documentRef: {
      body: { append },
      createElement: vi.fn(() => anchor),
    },
    urlApi: { createObjectURL, revokeObjectURL },
    BlobCtor: FakeBlob,
  })

  expect(filename).toBe('formatted-2026-07-26-143509.json')
  expect(blobs[0]).toMatchObject({
    parts: ['{\n  "ready": true\n}'],
    type: 'application/json',
  })
  expect(anchor).toMatchObject({
    href: 'blob:json-download',
    download: filename,
  })
  expect(click).toHaveBeenCalledOnce()
  expect(remove).toHaveBeenCalledOnce()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:json-download')
})
```

- [ ] **Step 5: Run the tests and confirm the download test fails**

Run: `npm test -- --run src/apps/json-formatter/downloadJson.test.js`

Expected: FAIL because `downloadJson` is not implemented.

- [ ] **Step 6: Implement the temporary anchor download**

```js
export function downloadJson(
  text,
  {
    date = new Date(),
    documentRef = document,
    urlApi = URL,
    BlobCtor = Blob,
  } = {},
) {
  const filename = createJsonFilename(date)
  const blob = new BlobCtor([text], { type: 'application/json' })
  const objectUrl = urlApi.createObjectURL(blob)
  const anchor = documentRef.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'
  documentRef.body.append(anchor)

  try {
    anchor.click()
  } finally {
    anchor.remove()
    urlApi.revokeObjectURL(objectUrl)
  }

  return filename
}
```

- [ ] **Step 7: Run the utility tests**

Run: `npm test -- --run src/apps/json-formatter/downloadJson.test.js`

Expected: PASS.

- [ ] **Step 8: Commit the utility**

```bash
git add src/apps/json-formatter/downloadJson.js src/apps/json-formatter/downloadJson.test.js
git commit -m "feat: add datetime json download utility"
```

---

### Task 2: Download actions and feedback

**Files:**
- Modify: `src/apps/json-formatter/JsonFormatterPage.jsx`
- Modify: `src/apps/json-formatter/JsonFormatterPage.test.jsx`
- Modify: `src/apps/json-formatter/JsonFormatterPage.css`

**Interfaces:**
- Consumes: `downloadJson(text)` from `downloadJson.js`.
- Produces: optional `downloadFile` page prop defaulting to `downloadJson`.
- Produces: buttons named `Download JSON` in the formatted editor and full-screen toolbar.
- Produces: `JSON downloaded` and `Download failed. Copy the JSON and save it manually.` feedback.

- [ ] **Step 1: Write failing empty, success, and failure component tests**

```jsx
it('disables downloading until the document is valid', () => {
  render(<JsonFormatterPage />)

  expect(screen.getByRole('button', { name: 'Download JSON' }).disabled).toBe(
    true,
  )
})

it('downloads the current formatted JSON and reports success', () => {
  const downloadFile = vi.fn(() => 'formatted-2026-07-26-143509.json')
  render(<JsonFormatterPage downloadFile={downloadFile} />)

  fireEvent.change(screen.getByLabelText('Input JSON'), {
    target: { value: '{"download":true}' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }))

  expect(downloadFile).toHaveBeenCalledWith('{\n  "download": true\n}')
  expect(screen.getByText('JSON downloaded')).toBeTruthy()
})

it('reports a browser download failure without changing the JSON', () => {
  const downloadFile = vi.fn(() => {
    throw new Error('Object URLs unavailable')
  })
  render(<JsonFormatterPage downloadFile={downloadFile} />)

  fireEvent.change(screen.getByLabelText('Input JSON'), {
    target: { value: '{"download":true}' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }))

  expect(
    screen.getByText('Download failed. Copy the JSON and save it manually.'),
  ).toBeTruthy()
  expect(screen.getByLabelText('Input JSON').value).toBe('{"download":true}')
})
```

- [ ] **Step 2: Run the component tests and confirm the missing-action failures**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: FAIL because Download JSON is not rendered.

- [ ] **Step 3: Implement the page action and shared feedback**

Import `downloadJson`, accept `downloadFile = downloadJson`, rename `copyFeedback` state to `documentFeedback`, and add:

```js
function handleDownload() {
  if (!canCopy) {
    return
  }

  try {
    downloadFile(formattedText)
    setDocumentFeedback('JSON downloaded')
  } catch {
    setDocumentFeedback(
      'Download failed. Copy the JSON and save it manually.',
    )
  }
}
```

Render Download JSON beside Copy JSON in both action areas using the same `disabled={!canCopy}` condition.

- [ ] **Step 4: Add a failing full-screen action test**

```jsx
it('offers download in the full-screen toolbar', () => {
  render(<JsonFormatterPage />)
  fireEvent.change(screen.getByLabelText('Input JSON'), {
    target: { value: '{"view":"large"}' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))

  expect(screen.getAllByRole('button', { name: 'Download JSON' })).toHaveLength(
    2,
  )
})
```

- [ ] **Step 5: Run the test and confirm the full-screen expectation fails**

Run: `npm test -- --run src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: FAIL until the full-screen action is rendered.

- [ ] **Step 6: Add the full-screen action and Arvenilo styling**

Use `json-action json-action--download` in both views. Style it as a transparent gold document action with a gold border, dark hover fill, visible focus inherited from `.json-action`, and the existing responsive action-grid behavior.

- [ ] **Step 7: Run focused tests and lint**

Run: `npm test -- --run src/apps/json-formatter/downloadJson.test.js src/apps/json-formatter/JsonFormatterPage.test.jsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 8: Run the full verification**

Run: `npm run test:run`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite exits successfully.

- [ ] **Step 9: Commit the integrated feature**

```bash
git add src/apps/json-formatter/JsonFormatterPage.jsx src/apps/json-formatter/JsonFormatterPage.test.jsx src/apps/json-formatter/JsonFormatterPage.css
git commit -m "feat: download formatted json files"
```
