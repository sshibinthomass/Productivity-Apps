# QR Generator Studio Design

Date: 2026-07-26
Status: Approved for implementation

## Goal

Add a comprehensive, public, browser-only QR Generator to the Arvenilo
Network. The studio must cover the common static QR use cases, expose a raw
payload escape hatch for schemes without a dedicated form, offer expressive
visual customization, protect scan reliability with clear guardrails, accept a
locally processed center logo, and export production-ready PNG and SVG files.

The feature is a static QR generator. Dynamic redirects, scan analytics,
expiring codes, password-protected destinations, campaigns, shared dashboards,
and server-managed destinations are intentionally excluded because they
require persistent backend infrastructure.

## Product Principles

- **Broad without being dense.** The user chooses a content type before seeing
  its fields. Only relevant controls are shown.
- **Useful immediately.** URL is the default content type and the live preview
  starts in a clear empty state.
- **Private by default.** Payloads and uploaded logos remain in the browser.
  The application makes no generation, upload, shortening, or analytics
  request.
- **Reliable before decorative.** The studio recommends a four-module quiet
  zone, high foreground/background contrast, sufficient error correction, and
  a conservative logo footprint.
- **Transparent encoding.** The exact generated payload can be inspected and
  copied so users can verify what the code contains.
- **Progressive power.** Essential content controls lead; styling, QR settings,
  and export controls remain discoverable without overwhelming a first-time
  user.

## User Flow

The page opens with the outcome-led introduction **Make one code. Use it
anywhere.** A three-part studio follows:

1. **Content** — choose a content category and complete a focused form.
2. **Design** — customize colors, module shapes, corner treatment, size, quiet
   zone, error correction, and an optional center logo.
3. **Preview and export** — inspect the live code, review scan-safety feedback,
   copy the payload or image, print, and download PNG or SVG.

On wide screens, content and design controls occupy a left workbench while the
preview remains sticky on the right. On narrow screens, the preview appears
directly after the content fields, followed by design and export controls so
users can confirm the result without traversing the entire form.

Changing content or design updates the preview after lightweight validation.
Invalid or incomplete forms preserve entered values and show a placeholder
instead of rendering a misleading QR code. Values are kept separately for each
content type during the current page session, so switching types never discards
work and returning to a type restores its fields.

## Supported Content Types

The studio groups dedicated templates by purpose. Every builder returns a
plain payload string and structured validation errors.

### Essentials

- **Website URL** — HTTP, HTTPS, and explicitly entered custom/deep-link
  schemes. HTTP/HTTPS is recommended but not silently added.
- **Plain text** — arbitrary text, including Unicode and multiple lines.
- **Custom payload** — an unmodified raw string for any QR-compatible scheme or
  format that does not have a dedicated form.

### Contact and communication

- **Digital contact card** — vCard 3.0 with name, organization, role, phone,
  email, website, postal address, and note. Empty optional fields are omitted.
- **Email** — recipient, optional subject, optional body, encoded as `mailto:`.
- **Phone** — international or local number encoded as `tel:`.
- **SMS** — recipient and optional message using an interoperable SMS URI.
- **WhatsApp** — international number and optional prefilled message using the
  official `wa.me` URL form.

### Connectivity

- **Wi-Fi** — SSID, security type (`WPA`, `WEP`, or open), password, and hidden
  network flag using the established `WIFI:` payload grammar. Reserved
  characters are escaped.

### Place and time

- **Location** — latitude, longitude, and optional place label using a `geo:`
  URI.
- **Calendar event** — title, start and end date/time, all-day mode, location,
  description, and optional event URL using a compact `VEVENT` payload. Dates
  are serialized deterministically and line-break/reserved-character escaping
  follows the calendar content-line rules needed by scanners.

### Profiles and applications

- **Social profile** — a provider selector for common public profile services
  and a username or complete profile URL. The output is always shown before
  generation. An `Other` provider accepts a complete URL.
- **App or deep link** — App Store URL, Play Store URL, universal link, or
  custom application URI without attempting device detection.

### Payments

- **UPI payment** — payee address, name, optional amount, currency, transaction
  note, and reference encoded as `upi://pay`.
- **PayPal payment link** — a complete PayPal payment URL or PayPal.Me handle
  with optional amount.
- **Bitcoin payment** — address, optional amount, label, and message using a
  BIP21-style URI.
- **Ethereum payment** — address and optional chain, value, and token contract
  fields using an ERC-681-style URI where the requested combination has a
  defined representation.
- **Generic payment or cryptocurrency URI** — scheme plus address/path and
  optional query parameters for other wallets and payment systems.

Payment forms only encode user-provided details. The app does not validate
ownership, resolve accounts, calculate exchange rates, initiate transactions,
store payment details, or assert that a receiving wallet supports a URI.
Before export, the exact payment payload is visible with a reminder to test it
in the intended payment app.

## Content Validation

Validation is specific to each content type:

- required fields are identified by label;
- URLs and deep links must contain a syntactically valid scheme when required;
- coordinates must be finite values within valid latitude and longitude
  ranges;
- event end time cannot precede its start time;
- numeric payment amounts must be positive decimal values;
- provider-specific identifiers are normalized only where the transformation
  is deterministic and shown to the user;
- the final encoded payload must not be empty;
- payload byte length is checked before rendering.

The QR encoder determines whether the selected error-correction level can hold
the payload. Oversized data produces an actionable message suggesting shorter
content, a lower error-correction level, or removal of the logo. Data is never
truncated.

No form claims that syntactically valid contact, payment, or destination data
exists or belongs to the user.

## QR Design Controls

The design panel provides:

- foreground and background colors with text inputs and color pickers;
- module style: square, rounded, dots, or soft diamond;
- outer corner style: square, rounded, or extra-rounded;
- inner corner style: square, rounded, or dot;
- output size presets of 256, 512, 1024, and 2048 pixels plus a custom size
  bounded from 128 through 4096 pixels;
- quiet zone measured in QR modules, defaulting to four;
- error correction levels L, M, Q, and H, defaulting to M;
- optional transparent background;
- optional center logo upload;
- logo scale and optional light backing plate;
- reset design action.

The default Arvenilo preset uses Spatial Ink modules on Interface White with
restrained rounded corners. Styling changes only rendering; the encoded payload
does not change.

Uploaded logos accept PNG, JPEG, WebP, GIF, and SVG files up to 5 MB. The UI
reports oversized, unsupported, or unreadable files. Every logo, including SVG,
is decoded into an isolated image surface and re-encoded as a static PNG data
URL before it reaches the QR renderer; embedded scripts, external references,
animation, and original SVG markup are not retained. Processing remains local,
and temporary object URLs are released after conversion or removal.

Adding a logo recommends error correction H and clamps the initial logo scale
to a conservative value. Users may reduce error correction or increase the
logo within bounded controls, but receive an explicit warning.

## Scan-Safety Guardrails

A persistent scan-safety panel reports **Strong**, **Review**, or **At risk**.
It evaluates:

- foreground/background luminance and contrast;
- whether modules are darker than the background;
- quiet-zone width;
- logo footprint;
- error correction relative to logo use;
- payload density relative to output size;
- transparent background use;
- highly decorative module/corner combinations on dense codes.

The default configuration is **Strong**. The quiet-zone control has a hard
minimum of four modules, and the logo control cannot exceed 25 percent of the
QR width. Other risky choices remain reversible and generate specific warnings
rather than a vague score.

The panel clearly states that software checks cannot guarantee scanning in
every camera, print material, size, lighting condition, or destination app.
Payment codes and heavily customized codes prompt the user to test the exported
file with the intended scanner before publishing.

## Preview, Inspection, and Export

The preview stage includes:

- the generated QR code on a neutral checker or solid surface appropriate to
  the selected background;
- content-type label and encoded byte count;
- the scan-safety result and issue list;
- a collapsible plain-text view of the exact encoded payload;
- a full-size preview action.

Available actions are:

- **Download PNG** at the selected pixel dimensions;
- **Download SVG** as a resolution-independent vector;
- **Copy image** when the Clipboard image API is supported;
- **Copy payload** as plain text;
- **Print QR** through a focused print layout;
- **Reset all** to the default URL template and design.

Exported filenames use `arvenilo-qr-<type>-YYYY-MM-DD` with the matching
extension. PNG export preserves the selected background or transparency. SVG
export includes the code geometry and, when used, an embedded logo so the file
does not depend on a temporary browser URL.

Copy and download failures preserve the generated code and return actionable
feedback. Unsupported clipboard-image environments hide or disable that action
while leaving downloads available.

## Visual Direction

The feature extends the existing Precision Spatial system rather than
introducing a separate visual language:

- Reality Mist or the active theme canvas surrounds the studio;
- Interface White and existing theme surfaces hold form controls;
- Spatial Ink anchors the preview stage and headings;
- Signal Mint marks the primary export action and strong scan state;
- Digital Violet distinguishes selected content types and advanced design
  controls;
- Safety Gold and a restrained red state communicate review and at-risk
  results;
- Sora carries the product headline, Inter the interface, and IBM Plex Mono
  encoded payloads, measurements, and QR settings.

The signature element is the **registration frame** around the live QR:
corner-bracket geometry derived from QR finder patterns expands subtly when the
code becomes valid. It is structural feedback rather than decoration. Reduced
motion disables the transition.

The content-type picker uses labeled categories and recognizable line icons.
The selected type, field labels, warnings, and actions remain understandable
without color. Controls retain visible keyboard focus and touch-friendly
targets in both themes.

## Architecture

The feature follows the registry-driven React/Vite structure and separates
payload logic from rendering:

1. `qrPayloads.js` defines template metadata, initial values, validation, and
   deterministic payload builders.
2. `qrSafety.js` computes color, logo, quiet-zone, density, and correction-level
   findings without touching the DOM.
3. `qrRenderConfig.js` converts application design state into the selected QR
   rendering library's configuration.
4. `qrExport.js` owns PNG, SVG, clipboard-image, logo embedding, filename, and
   print helpers.
5. `QrContentForm.jsx` renders the selected template from focused field
   components while leaving validation and state ownership with the page.
6. `QrPreview.jsx` owns the QR rendering instance and updates it when valid
   payload or design inputs change.
7. `QrGeneratorPage.jsx` owns selected type, values by type, design state,
   validation, preview state, feedback, and reset behavior.
8. `QrGeneratorPage.css` implements the responsive workbench, preview stage,
   registration frame, print layout, theme behavior, and reduced-motion rules.

The app registry exposes `/qr-generator` as a public available tool with its own
icon and a mint accent. The home card and route are generated by existing
registry behavior.

A maintained QR rendering dependency will provide standards-compliant encoding
and styled SVG/canvas output. Payload construction, validation, safety checks,
and user-facing state remain application-owned and independently testable. No
network-backed QR API or URL shortener is used.

## Data Flow

1. The selected content template provides initial field values and field
   metadata.
2. User edits update the page's per-template value map.
3. The template validator returns field errors and either a complete payload or
   no renderable payload.
4. A valid payload and current design state produce the renderer configuration.
5. Safety analysis reads the payload metrics and design state and produces
   ordered findings.
6. The preview updates in place without remounting the entire page.
7. Export actions request current SVG or canvas data from the preview/export
   layer and create a temporary local download or clipboard item.

Switching content types preserves values already entered in other types for the
current page session. Reset all clears every type and restores the default
design. No application state is persisted after the tab closes in the first
release.

## Error Handling and Accessibility

- Field errors appear next to their controls and are associated through
  `aria-describedby`.
- Preview validity and copy/download feedback use polite live regions.
- Export failures use an alert only when the user initiated the failed action.
- The content-type picker is keyboard navigable with native button semantics.
- Color controls always have editable text values and are not understandable by
  swatch alone.
- Full-size preview uses an accessible dialog, closes with Escape, and restores
  focus to its trigger.
- Uploaded-logo controls expose file type and size guidance before selection.
- Print CSS removes navigation, forms, and nonessential controls while
  preserving the QR, payload label, and adequate physical whitespace.
- Both light and dark site themes maintain an explicit QR background independent
  of the surrounding page theme.

## Testing

Unit tests cover:

- every dedicated payload builder and reserved-character escaping;
- Unicode and multiline text;
- URL/deep-link validation without silent scheme guessing;
- vCard omission and escaping rules;
- Wi-Fi security modes and escaped credentials;
- coordinate bounds;
- all-day and timed event serialization;
- provider URL normalization;
- each payment URI and invalid amount handling;
- custom raw payload preservation;
- contrast, quiet-zone, logo, error-correction, and density safety findings;
- renderer configuration mapping;
- deterministic filenames and export fallbacks.

Component tests cover:

- registry metadata and public routing;
- categorized content-type selection;
- URL default state and live valid preview;
- contextual fields for representative templates;
- invalid field feedback and disabled export actions;
- payload inspection and copying;
- design-control updates;
- logo selection, safety feedback, and removal;
- PNG and SVG export calls;
- clipboard-image capability fallback;
- full-size preview focus behavior;
- switching types with session value preservation;
- reset-all behavior.

Final verification includes the focused QR tests, full test suite, ESLint,
production build, and browser inspection at desktop and mobile widths in light
and dark themes. Manual browser checks cover a representative URL, Wi-Fi,
vCard, event, payment, Unicode text, custom payload, transparent SVG, large PNG,
and logo-centered code. Representative exports are scanned with at least two
independent scanner implementations where available.

## Success Criteria

The feature is complete when a user can:

1. Open QR Generator without signing in.
2. Generate a valid static QR from every dedicated template or an arbitrary raw
   payload.
3. Understand and correct invalid content without losing entered values.
4. Customize the code and add a local center logo while receiving specific
   scan-safety guidance.
5. Inspect exactly what will be encoded.
6. download PNG and SVG output, copy supported output, and print a focused code.
7. Complete the primary workflow by keyboard at mobile and desktop widths.
8. Use the full generator without sending payload or logo data to a server.
