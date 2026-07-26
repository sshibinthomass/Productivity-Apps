# QR Builder Tabs Design

## Goal

Shorten the QR generator workspace on desktop and mobile by replacing the vertically stacked “Build your QR” and “Style and scan settings” sections with two connected tabs:

- **Build QR** for QR type selection and content fields.
- **Design** for colors, module and corner styles, scan settings, and center-logo controls.

The live QR preview remains outside the tab panels so it stays available while either tab is active.

## Interaction Model

- “Build QR” is selected when the page first loads.
- Selecting a tab shows its associated panel and hides the other panel.
- Both panels remain mounted in the document. The inactive panel uses the native `hidden` state rather than being unmounted.
- Switching tabs preserves all work, including:
  - the selected QR type;
  - entered content and form fields;
  - color and style selections;
  - scan settings;
  - uploaded logo state.
- Generating, downloading, copying, resetting, validation, and preview behavior remain unchanged.

## Layout

### Desktop

- The builder card begins with a two-column connected tab bar.
- Each tab is a wide button that carries the existing numbered visual language:
  - `01` — Build QR
  - `02` — Design
- Only the selected panel occupies vertical space.
- The preview remains in its existing separate column and keeps its sticky behavior.

### Mobile

- The two tabs become compact, equal-width controls at the top of the builder card.
- Labels remain visible without horizontal scrolling.
- Only one panel occupies vertical space, substantially reducing page length.
- The preview remains outside the tabs and appears below the builder workspace in normal document flow.
- Controls and tab targets retain touch-friendly sizing.

## Component Boundaries

Add a focused `QrBuilderTabs` component responsible only for the tab controls:

- receives `activeTab` and `onChange`;
- renders the tablist and the two tab buttons;
- owns keyboard navigation and focus movement;
- does not own QR content or design state.

`QrGeneratorPage` owns the active tab value and renders both existing sections as tab panels. The existing `QrTypePicker`, `QrContentForm`, and `QrDesignControls` components remain responsible for their current functionality.

The preview remains a sibling of the tabbed builder card, not a child of either tab panel.

## Accessibility

- The tab container uses `role="tablist"` with an accessible label.
- Each tab button uses:
  - `role="tab"`;
  - a stable `id`;
  - `aria-controls` pointing to its panel;
  - `aria-selected`;
  - roving `tabIndex`, with only the active tab in the normal tab order.
- Each panel uses:
  - `role="tabpanel"`;
  - a stable `id`;
  - `aria-labelledby` pointing to its tab;
  - `hidden` when inactive.
- Activating a tab with a mouse, touch, Enter, or Space selects its panel.
- Left and Right Arrow move focus and selection between tabs.
- Home selects the first tab; End selects the last tab.
- Keyboard movement wraps at the ends for Left and Right Arrow.
- Existing focus styles remain visible and are adapted to the connected tab design.

## Visual Treatment

- Reuse the QR generator’s existing typography, borders, teal accents, rounded surfaces, and numbered section markers.
- The active tab reads as connected to the visible white panel.
- The inactive tab has lower visual emphasis but remains clearly interactive.
- Avoid introducing a second card inside the selected panel; the tabs and content should feel like one compact workspace.
- Preserve clear section labels and field grouping inside each panel.

## State and Data Flow

- `QrGeneratorPage` adds one local active-tab state value with two valid identifiers: `build` and `design`.
- Existing QR content and design state remain in their current owners.
- Tab changes do not reset, recreate, or submit either panel.
- The active tab is presentation state only and does not alter the encoded QR value.
- Resetting the QR generator retains the current tab unless existing reset behavior explicitly requires a full workspace reset.

## Testing

Automated tests will verify:

- Build QR is the default active tab.
- Only the active panel is visible.
- Mouse activation switches panels.
- Enter and Space activate a focused tab.
- Left Arrow, Right Arrow, Home, and End update focus and selection correctly.
- Tab ARIA relationships and roving `tabIndex` are correct.
- Entered Build QR values persist after switching to Design and back.
- Design selections persist after switching to Build QR and back.
- The preview remains present and usable under both tabs.
- Existing QR type, generation, validation, reset, and download tests continue to pass.

Browser verification will cover representative desktop and narrow mobile viewports, checking:

- the connected tab appearance;
- absence of horizontal overflow;
- reduced page length;
- touch target sizing;
- sticky desktop preview and below-workspace mobile preview;
- keyboard focus visibility and order.

## Out of Scope

- Changing supported QR types or their payload formats.
- Redesigning the preview card or download actions.
- Persisting the active tab across page reloads.
- Moving the preview into a third tab.
- Changing QR generation libraries or image export behavior.
