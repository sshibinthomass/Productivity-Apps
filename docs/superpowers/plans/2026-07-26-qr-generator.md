# QR Generator Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, local-only QR studio with broad static payload templates, live styled preview, scan-safety guidance, local logo processing, and PNG/SVG/copy/print output.

**Architecture:** Pure modules own payload construction, safety analysis, renderer options, logo conversion, and exports. React components own the selected template, per-template field state, progressive design controls, preview lifecycle, dialogs, and feedback. `qr-code-styling` 1.9.2 supplies standards-compliant encoding and SVG/canvas generation; no QR or shortening service is used.

**Tech Stack:** React 19, Vite 8, Vitest 4, Testing Library, `qr-code-styling` 1.9.2, existing Arvenilo CSS tokens.

## Global Constraints

- The route is `/qr-generator`, public, `available`, and uses the mint accent.
- Payload and logo data never leave the browser and are not persisted after the tab closes.
- Dedicated templates cover URL, text, raw data, vCard, email, phone, SMS, WhatsApp, Wi-Fi, location, calendar event, social profile, app/deep link, UPI, PayPal, Bitcoin, Ethereum, and generic payment URI.
- Invalid values are never truncated or silently repaired.
- Quiet zone has a hard four-module minimum; logo width is capped at 25 percent.
- Logo files are PNG, JPEG, WebP, GIF, or SVG, at most 5 MB, and are rasterized locally before rendering.
- Output sizes are 128–4096 px; presets are 256, 512, 1024, and 2048.
- PNG and SVG export, payload copy, supported image copy, focused print, full-size preview, and reset are included.
- Keyboard focus, live feedback, reduced motion, light/dark themes, and mobile layout are required.

---

### Task 1: Essential Payload Model

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/apps/qr-generator/qrPayloads.js`
- Create: `src/apps/qr-generator/qrPayloads.test.js`

**Interfaces:**
- Produces: `QR_TYPES`, `createInitialValues()`, and `buildQrPayload(type, values)`.
- `buildQrPayload` returns `{ payload: string, errors: Record<string, string>, byteLength: number }`.

- [ ] **Step 1: Install the renderer**

Run: `npm install qr-code-styling@1.9.2`

- [ ] **Step 2: Write failing essential-template tests**

```js
expect(buildQrPayload('url', { url: 'https://arvenilo.com/tools' })).toMatchObject({
  payload: 'https://arvenilo.com/tools',
  errors: {},
})
expect(buildQrPayload('url', { url: 'arvenilo.com' }).errors.url).toBe(
  'Enter a complete URL including its scheme.',
)
expect(buildQrPayload('text', { text: 'Hello 🌍' }).payload).toBe('Hello 🌍')
expect(buildQrPayload('raw', { payload: 'otpauth://totp/Test?secret=ABC' }).payload).toBe(
  'otpauth://totp/Test?secret=ABC',
)
```

- [ ] **Step 3: Run the tests and verify RED**

Run: `npm run test:run -- src/apps/qr-generator/qrPayloads.test.js`
Expected: FAIL because `qrPayloads.js` does not exist.

- [ ] **Step 4: Implement the metadata and result contract**

```js
export const QR_TYPES = [
  { id: 'url', category: 'Essentials', label: 'Website URL' },
  { id: 'text', category: 'Essentials', label: 'Plain text' },
  { id: 'raw', category: 'Essentials', label: 'Custom payload' },
  { id: 'vcard', category: 'Contact', label: 'Contact card' },
  { id: 'email', category: 'Contact', label: 'Email' },
  { id: 'phone', category: 'Contact', label: 'Phone' },
  { id: 'sms', category: 'Contact', label: 'SMS' },
  { id: 'whatsapp', category: 'Contact', label: 'WhatsApp' },
  { id: 'wifi', category: 'Connectivity', label: 'Wi-Fi' },
  { id: 'location', category: 'Place & time', label: 'Location' },
  { id: 'event', category: 'Place & time', label: 'Calendar event' },
  { id: 'social', category: 'Profiles & apps', label: 'Social profile' },
  { id: 'app', category: 'Profiles & apps', label: 'App or deep link' },
  { id: 'upi', category: 'Payments', label: 'UPI payment' },
  { id: 'paypal', category: 'Payments', label: 'PayPal' },
  { id: 'bitcoin', category: 'Payments', label: 'Bitcoin' },
  { id: 'ethereum', category: 'Payments', label: 'Ethereum' },
  { id: 'payment', category: 'Payments', label: 'Other payment URI' },
]

export function buildQrPayload(type, values) {
  const result = builders[type]?.(values) ?? {
    payload: '',
    errors: { type: 'Choose a supported content type.' },
  }
  return {
    ...result,
    byteLength: result.payload ? new TextEncoder().encode(result.payload).length : 0,
  }
}
```

Implement URL validation with `new URL`, preserve text/raw input exactly, and return field-specific errors for blanks.

- [ ] **Step 5: Run the focused tests**

Run: `npm run test:run -- src/apps/qr-generator/qrPayloads.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/apps/qr-generator/qrPayloads.js src/apps/qr-generator/qrPayloads.test.js
git commit -m "feat: add qr payload foundation"
```

### Task 2: Contact and Connectivity Payloads

**Files:**
- Modify: `src/apps/qr-generator/qrPayloads.js`
- Modify: `src/apps/qr-generator/qrPayloads.test.js`

**Interfaces:**
- Extends `buildQrPayload` with `vcard`, `email`, `phone`, `sms`, `whatsapp`, and `wifi`.

- [ ] **Step 1: Write failing literal payload tests**

```js
expect(buildQrPayload('wifi', {
  ssid: 'Studio;5G',
  security: 'WPA',
  password: 'pass:word',
  hidden: true,
}).payload).toBe('WIFI:T:WPA;S:Studio\\;5G;P:pass\\:word;H:true;;')

expect(buildQrPayload('email', {
  to: 'hello@example.com',
  subject: 'Hello there',
  body: 'Line one\nLine two',
}).payload).toBe(
  'mailto:hello@example.com?subject=Hello+there&body=Line+one%0ALine+two',
)

expect(buildQrPayload('vcard', {
  firstName: 'Ada',
  lastName: 'Lovelace',
  organization: 'Analytical Engines',
  phone: '+441234',
  email: 'ada@example.com',
}).payload).toContain('BEGIN:VCARD\r\nVERSION:3.0\r\nN:Lovelace;Ada;;;')
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/apps/qr-generator/qrPayloads.test.js`
Expected: FAIL because the new builders are unsupported.

- [ ] **Step 3: Implement deterministic escaping and builders**

Add:

```js
function escapeWifi(value) {
  return String(value).replace(/([\\;,:"'])/g, '\\$1')
}

function escapeVCard(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([;,])/g, '\\$1')
}
```

Use `URLSearchParams` for mail, SMS, and WhatsApp query strings. Omit empty vCard lines and validate required recipient/number/SSID fields.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm run test:run -- src/apps/qr-generator/qrPayloads.test.js`
Expected: PASS.

```powershell
git add src/apps/qr-generator/qrPayloads.js src/apps/qr-generator/qrPayloads.test.js
git commit -m "feat: add contact and wifi qr payloads"
```

### Task 3: Place, Event, Profile, and Payment Payloads

**Files:**
- Modify: `src/apps/qr-generator/qrPayloads.js`
- Modify: `src/apps/qr-generator/qrPayloads.test.js`

**Interfaces:**
- Extends `buildQrPayload` with `location`, `event`, `social`, `app`, `upi`, `paypal`, `bitcoin`, `ethereum`, and `payment`.

- [ ] **Step 1: Write failing boundary and serialization tests**

```js
expect(buildQrPayload('location', {
  latitude: '52.52',
  longitude: '13.405',
  label: 'Berlin',
}).payload).toBe('geo:52.52,13.405?q=52.52%2C13.405%28Berlin%29')

expect(buildQrPayload('location', {
  latitude: '91',
  longitude: '13',
}).errors.latitude).toBe('Latitude must be between -90 and 90.')

expect(buildQrPayload('upi', {
  payee: 'hello@upi',
  name: 'Arvenilo',
  amount: '12.50',
  currency: 'INR',
  note: 'QR test',
}).payload).toBe(
  'upi://pay?pa=hello%40upi&pn=Arvenilo&am=12.50&cu=INR&tn=QR+test',
)

expect(buildQrPayload('bitcoin', {
  address: 'bc1example',
  amount: '0.001',
  label: 'Arvenilo',
}).payload).toBe('bitcoin:bc1example?amount=0.001&label=Arvenilo')
```

Also add literal all-day/timed VEVENT expectations, social provider URL expectations, Ethereum URI expectations, positive-decimal validation, and end-before-start validation.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/apps/qr-generator/qrPayloads.test.js`
Expected: FAIL for unsupported builders.

- [ ] **Step 3: Implement URI helpers and builders**

```js
function appendQuery(base, entries) {
  const params = new URLSearchParams()
  entries.forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value)
  })
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

function isPositiveDecimal(value) {
  return /^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0
}
```

Serialize VEVENT with CRLF, escaped content values, deterministic local date/date-time strings, and `BEGIN:VCALENDAR`/`END:VCALENDAR`. Build provider URLs from an explicit provider map and show the resulting payload unchanged.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm run test:run -- src/apps/qr-generator/qrPayloads.test.js`
Expected: PASS.

```powershell
git add src/apps/qr-generator/qrPayloads.js src/apps/qr-generator/qrPayloads.test.js
git commit -m "feat: add event profile and payment qr payloads"
```

### Task 4: Safety, Renderer Options, Logo Processing, and Export Helpers

**Files:**
- Create: `src/apps/qr-generator/qrSafety.js`
- Create: `src/apps/qr-generator/qrSafety.test.js`
- Create: `src/apps/qr-generator/qrRenderConfig.js`
- Create: `src/apps/qr-generator/qrRenderConfig.test.js`
- Create: `src/apps/qr-generator/qrMedia.js`
- Create: `src/apps/qr-generator/qrMedia.test.js`

**Interfaces:**
- Produces `DEFAULT_QR_DESIGN`, `analyzeQrSafety({ design, byteLength })`, and `createQrOptions(payload, design)`.
- Produces `processLogoFile(file, browser)` and `createExportFilename(type, extension, date)`.

- [ ] **Step 1: Write failing safety and renderer tests**

```js
expect(analyzeQrSafety({
  design: DEFAULT_QR_DESIGN,
  byteLength: 40,
}).level).toBe('strong')

expect(analyzeQrSafety({
  design: { ...DEFAULT_QR_DESIGN, foreground: '#777777', background: '#888888' },
  byteLength: 40,
}).issues).toContainEqual(expect.objectContaining({ code: 'low-contrast' }))

expect(createQrOptions('hello', {
  ...DEFAULT_QR_DESIGN,
  size: 512,
  errorCorrection: 'H',
})).toMatchObject({
  type: 'svg',
  width: 512,
  height: 512,
  data: 'hello',
  qrOptions: { errorCorrectionLevel: 'H' },
})
```

Add tests for dark-on-light ordering, logo/error-correction warnings, dense payload/size warning, four-module minimum mapping, transparent background, logo cap, file type/5 MB errors, and deterministic filename.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/apps/qr-generator/qrSafety.test.js src/apps/qr-generator/qrRenderConfig.test.js src/apps/qr-generator/qrMedia.test.js`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement pure safety and option mapping**

`DEFAULT_QR_DESIGN` is:

```js
{
  foreground: '#081D21',
  background: '#FFFFFF',
  transparent: false,
  dotStyle: 'rounded',
  outerCornerStyle: 'extra-rounded',
  innerCornerStyle: 'dot',
  size: 512,
  quietZone: 4,
  errorCorrection: 'M',
  logoDataUrl: '',
  logoScale: 0.2,
  logoPlate: true,
}
```

Map app styles to `qr-code-styling` types, use `imageOptions.imageSize`,
`hideBackgroundDots`, `saveAsBlob: true`, and convert four quiet-zone modules
to a conservative pixel margin from output size.

- [ ] **Step 4: Implement media helpers**

Validate file MIME and size before calling injected browser primitives. Decode
to an image, draw the first frame into a bounded canvas, and return a PNG data
URL. Reject SVG containing `script`, `foreignObject`, event-handler attributes,
or external `href`/`xlink:href` before decode.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:run -- src/apps/qr-generator/qrSafety.test.js src/apps/qr-generator/qrRenderConfig.test.js src/apps/qr-generator/qrMedia.test.js`
Expected: PASS.

```powershell
git add src/apps/qr-generator/qrSafety.js src/apps/qr-generator/qrSafety.test.js src/apps/qr-generator/qrRenderConfig.js src/apps/qr-generator/qrRenderConfig.test.js src/apps/qr-generator/qrMedia.js src/apps/qr-generator/qrMedia.test.js
git commit -m "feat: add qr safety and media utilities"
```

### Task 5: Guided Content Workbench

**Files:**
- Create: `src/apps/qr-generator/QrContentForm.jsx`
- Create: `src/apps/qr-generator/QrGeneratorPage.jsx`
- Create: `src/apps/qr-generator/QrGeneratorPage.test.jsx`

**Interfaces:**
- `QrContentForm({ type, values, errors, onChange })`.
- `QrGeneratorPage({ createQrCode, processLogo, clipboard, printPage })` permits narrow dependency injection for browser-only effects.

- [ ] **Step 1: Write failing interaction tests**

```jsx
render(<QrGeneratorPage createQrCode={createQrCodeStub} />)
expect(screen.getByRole('heading', { name: 'Make one code. Use it anywhere.' })).toBeTruthy()
expect(screen.getByRole('button', { name: /Website URL/ })).toHaveAttribute('aria-pressed', 'true')
await user.type(screen.getByLabelText('Website URL'), 'https://arvenilo.com')
expect(screen.getByText('https://arvenilo.com')).toBeTruthy()
expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
```

Add tests for grouped template selection, contextual Wi-Fi fields, field errors,
per-type session value restoration, exact payload inspection, copy payload,
and reset all.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/apps/qr-generator/QrGeneratorPage.test.jsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the page state and generated form**

Keep `valuesByType` as `{ [typeId]: createInitialValues(typeId) }`. On field
change, update only that type. Derive payload results with `useMemo`. Render
native inputs/selects/textareas from explicit field descriptors; do not use
unlabeled generic controls.

- [ ] **Step 4: Run tests and commit**

Run: `npm run test:run -- src/apps/qr-generator/QrGeneratorPage.test.jsx`
Expected: PASS.

```powershell
git add src/apps/qr-generator/QrContentForm.jsx src/apps/qr-generator/QrGeneratorPage.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx
git commit -m "feat: add guided qr content workbench"
```

### Task 6: Live Preview, Design Controls, Logo, and Output Actions

**Files:**
- Create: `src/apps/qr-generator/QrPreview.jsx`
- Create: `src/apps/qr-generator/QrDesignControls.jsx`
- Modify: `src/apps/qr-generator/QrGeneratorPage.jsx`
- Modify: `src/apps/qr-generator/QrGeneratorPage.test.jsx`

**Interfaces:**
- `QrPreview({ payload, design, valid, factory, onReady })` appends once and updates thereafter.
- `QrDesignControls({ design, safety, onChange, onLogo, onRemoveLogo, logoError })`.
- The renderer handle exposes `getRawData(extension)` and `download({ name, extension })`.

- [ ] **Step 1: Write failing preview and action tests**

Test these observable behaviors:

```js
expect(factory).toHaveBeenCalledTimes(1)
expect(qr.update).toHaveBeenLastCalledWith(expect.objectContaining({
  data: 'https://arvenilo.com',
}))
```

Assert visible Strong/Review/At risk feedback, color and style updates, logo
success/error/removal, error-correction recommendation, full-size dialog Escape
close/focus restoration, PNG/SVG download arguments, capability-gated image
copy, copy/download errors, and print callback.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/apps/qr-generator/QrGeneratorPage.test.jsx`
Expected: FAIL for missing preview/design/output behavior.

- [ ] **Step 3: Implement preview lifecycle**

Create a renderer once in `useEffect`, append it to a ref, update on valid
payload/design changes, clear the host when invalid, and expose the current
instance to page actions. In production the factory returns
`new QRCodeStyling(options)`.

- [ ] **Step 4: Implement controls and actions**

Use native color/range/select/file controls with visible text labels. Generate
filenames through `createExportFilename`; call `download` for PNG/SVG. For image
copy, call `getRawData('png')` and write `new ClipboardItem({ 'image/png': blob
})`. Copy payload with `navigator.clipboard.writeText`. Print with
`window.print()`.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:run -- src/apps/qr-generator/QrGeneratorPage.test.jsx`
Expected: PASS.

```powershell
git add src/apps/qr-generator/QrPreview.jsx src/apps/qr-generator/QrDesignControls.jsx src/apps/qr-generator/QrGeneratorPage.jsx src/apps/qr-generator/QrGeneratorPage.test.jsx
git commit -m "feat: add styled qr preview and exports"
```

### Task 7: Arvenilo Presentation and App Integration

**Files:**
- Create: `src/apps/qr-generator/QrGeneratorPage.css`
- Modify: `src/apps/qr-generator/QrGeneratorPage.jsx`
- Modify: `src/components/icons/AppIcons.jsx`
- Modify: `src/config/appRegistry.jsx`
- Modify: `src/config/appRegistry.test.jsx`
- Modify: `src/App.test.jsx`
- Modify: `README.md`

**Interfaces:**
- Produces `QrIcon`.
- Registers `QrGeneratorPage` with the shared registry.

- [ ] **Step 1: Write failing registry and route tests**

```js
expect(appRegistry.find(({ id }) => id === 'qr-generator')).toMatchObject({
  title: 'QR Generator',
  path: '/qr-generator',
  status: 'available',
  accent: 'mint',
  category: 'Creation utility',
  requiresAuth: false,
})
```

Render `/qr-generator` signed out and assert the Website URL field is visible
while Google sign-in is absent.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/config/appRegistry.test.jsx src/App.test.jsx`
Expected: FAIL because the app is not registered.

- [ ] **Step 3: Add the icon, registry entry, and README route**

Add `QrIcon` using finder-pattern paths and import/register the page before the
coming-soon entries. Update all exact registry counts and ordered title
expectations.

- [ ] **Step 4: Implement the visual system**

Create the two-column studio, sticky preview, finder-pattern registration
frame, categorized type grid, content/design panels, safety states, full-size
dialog, checkerboard transparency surface, responsive reorder, print rules,
dark theme behavior, visible focus, 44 px targets, and reduced-motion override
using existing Arvenilo variables only.

- [ ] **Step 5: Run focused and full checks**

Run: `npm run test:run -- src/config/appRegistry.test.jsx src/App.test.jsx src/apps/qr-generator`
Expected: PASS.

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 6: Commit**

```powershell
git add src/apps/qr-generator/QrGeneratorPage.css src/apps/qr-generator/QrGeneratorPage.jsx src/components/icons/AppIcons.jsx src/config/appRegistry.jsx src/config/appRegistry.test.jsx src/App.test.jsx README.md
git commit -m "feat: integrate qr generator studio"
```

### Task 8: Browser and Production Verification

**Files:**
- Modify only files implicated by verification failures.

**Interfaces:**
- Consumes the completed QR Generator route and production build.

- [ ] **Step 1: Run all automated gates**

Run:

```powershell
npm run test:run
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits 0, and Vite production build exits 0.

- [ ] **Step 2: Inspect in a real browser**

Start `npm run dev -- --host 127.0.0.1`, open `/qr-generator`, and verify at
1440×1000 and 390×844 in light and dark themes:

- URL, Wi-Fi, vCard, event, UPI, Unicode text, and raw payload generation;
- sticky/stacked preview ordering;
- Strong/Review/At risk safety states;
- logo upload/removal and H-level recommendation;
- full-size dialog keyboard behavior;
- PNG/SVG download, payload copy, image-copy capability handling, and print;
- no network request containing payload or logo data;
- no horizontal page overflow and readable 200% zoom.

- [ ] **Step 3: Verify representative exports**

Decode URL, Wi-Fi, vCard, Unicode, payment, and logo-centered outputs with two
independent scanner implementations when available. Record any unsupported
consumer-specific payload as compatibility guidance, not silent transformation.

- [ ] **Step 4: Re-run gates after any browser fix**

Run:

```powershell
npm run test:run
npm run lint
npm run build
```

Expected: all exit 0.

- [ ] **Step 5: Commit verification fixes if present**

```powershell
git add src/apps/qr-generator src/components/icons/AppIcons.jsx src/config/appRegistry.jsx src/config/appRegistry.test.jsx src/App.test.jsx README.md package.json package-lock.json
git commit -m "fix: polish qr generator verification"
```
