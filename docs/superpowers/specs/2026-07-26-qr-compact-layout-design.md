# Compact QR Generator Layout

## Goal

Reduce the QR Generator's page length on desktop and mobile without removing
any payload type, field, design control, preview, or export action. The current
390 × 844 layout is 3,634 pixels tall; the purpose catalog alone uses 1,199
pixels and pushes the preview to 2,471 pixels. The redesigned empty state
should place the preview above 1,500 pixels on the same viewport.

## Interaction model

Replace the separate full purpose catalog and details cards with one combined
content panel. Its first section contains:

- four quick-pick cards for Website URL, Plain text, Contact card, and Wi-Fi;
- an accessible, categorized `All QR types` select containing every supported
  type, including the four quick picks;
- a compact selected-type summary showing its category, name, and description.

The selected type has one source of truth. A quick-pick card and the select
both update that value, clear stale feedback and preview errors, and reveal the
corresponding fields immediately below in the same panel. Values already
entered for another type remain available when the user returns to it.

When a type selected from the full catalog is not a quick pick, none of the
quick cards appears pressed; the select and summary still show the active type.
The quick-pick cards remain buttons with `aria-pressed`, and the select has a
visible label.

## Layout

Desktop and mobile use the same information order:

1. compact introduction;
2. combined purpose and details panel;
3. collapsed design settings;
4. preview, safety status, and exports.

On desktop, the four quick picks form a single row and the categorized select
sits alongside or immediately beneath them. On mobile, the quick picks form a
two-column grid and the select spans the panel width. Descriptions remain on
desktop cards and are hidden on narrow screens, matching the current compact
card behavior.

The design-settings disclosure stays collapsed by default. The preview remains
after the builder on viewports below 900 pixels and stays in the existing
sticky right column on wider screens. Existing colors, typography, borders,
focus styles, and motion behavior remain part of the Arvenilo visual system.

## Component boundaries

`QrGeneratorPage` continues to own the selected type and payload state. A small
purpose-picker component renders the quick cards and categorized select from
the existing payload metadata. It receives the selected type and a single
change callback, so it does not duplicate state or payload rules.

`QrContentForm`, `QrDesignControls`, `QrPreview`, payload builders, safety
checks, and export utilities do not change their public interfaces. The
combined panel is a layout and navigation improvement, not a payload-model
rewrite.

## Responsive and accessibility requirements

- Every supported QR type must be reachable through the select.
- Quick cards and the select must stay synchronized.
- Keyboard users must be able to tab to and operate both controls.
- The active quick card must expose `aria-pressed="true"`.
- The select must expose a persistent visible label and categorized options.
- Focus indicators, 44-pixel minimum touch targets, dark mode, and reduced
  motion behavior must remain intact.
- The compact layout must not introduce horizontal page scrolling at 390
  pixels.

## Testing and verification

Automated component tests will verify:

- the four quick picks render;
- every payload type is present in the categorized select;
- selecting a quick card updates the fields and select;
- selecting a non-quick type updates the fields with no quick card pressed;
- values survive switching through both interaction paths;
- design controls, preview generation, and exports retain their current
  behavior.

The complete test, lint, and production-build commands must pass. Browser
verification will cover 390 × 844, a tablet viewport, and a desktop viewport.
At 390 × 844, the empty-state preview must begin before 1,500 pixels and the
document must have no horizontal overflow.

## Out of scope

This change does not add payload types, alter QR encoding, redesign the global
header, change Firebase behavior, move the preview into a modal or bottom
sheet, or change the existing desktop sticky-preview breakpoint.
