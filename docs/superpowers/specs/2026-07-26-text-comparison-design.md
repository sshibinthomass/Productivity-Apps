# Text Comparison Workbench

Date: 2026-07-26
Status: Approved for implementation

## Goal

Add a public Arvenilo Network utility that compares two pieces of prose or code and makes every addition and removal easy to trace across aligned side-by-side results.

## Scope

The new utility will be registered as **Text Comparison** at `/text-comparison`. It will run entirely in the browser, require no authentication, send no text over the network, and persist no entered content.

The initial release includes:

- two plain-text editors;
- explicit word-level and character-level comparison modes;
- an explicit comparison action;
- aligned side-by-side results;
- addition and removal counts;
- identical, validation, and over-limit states;
- clear-all behavior.

The initial release does not include file uploads, syntax highlighting, editable results, comparison history, exports, copy buttons, whitespace-ignore settings, or live comparison while typing.

## Interaction Design

The page opens with an outcome-led introduction: **See exactly what changed.**

The focused workbench contains:

1. A segmented **Words / Characters** mode control, defaulting to Words.
2. Two equal editors labeled **Text 1 / Original** and **Text 2 / Revised**.
3. A primary **Compare texts** button.
4. A secondary **Clear all** button.
5. A result region beneath the editors.

The primary action remains disabled until both editors contain at least one character. Whitespace is valid comparison content and is not silently trimmed.

Submitting a comparison renders a stable result. Changing either editor or the comparison mode clears that result, preventing stale highlights from being mistaken for the current inputs. Clear all empties both editors, restores Words mode, and removes the result.

Keyboard focus remains visible. The mode control uses native radio inputs, the editors use visible labels, and status text is announced through an appropriate live region.

## Result Design

Results use two synchronized columns:

- the left column represents Text 1 and marks removals;
- the right column represents Text 2 and marks additions;
- unchanged content appears neutrally on both sides;
- blank placeholders preserve alignment for lines that exist on only one side.

The result header reports:

- whether the texts are identical;
- the number of added tokens;
- the number of removed tokens;
- the active comparison mode.

Removed content uses Digital Violet and a visible **Removed** legend. Added content uses Signal Mint and a visible **Added** legend. Color is never the only state indicator.

A narrow central comparison seam visually connects paired result rows. Its markers represent changed rows rather than serving as decoration. On mobile, the result remains a paired horizontal comparison surface with an explicit scroll cue so code alignment is preserved instead of stacking unrelated lines.

## Arvenilo Visual System

The utility uses the existing shared Arvenilo tokens and fonts:

- Reality Mist for the page canvas;
- Spatial Ink for primary text and the comparison stage;
- Interface White for editable surfaces;
- Signal Mint for the primary action and additions;
- Digital Violet for removals;
- Context Slate and cool borders for secondary structure;
- Sora for the product headline;
- Inter for interface copy;
- IBM Plex Mono for modes, counts, legends, editor content, and comparison output.

The workbench uses a restrained grid, borders before shadows, existing control and stage radii, and the established theme variables so light and dark modes remain coherent.

## Comparison Architecture

The feature is divided into four focused units:

1. `diffUtils.js` transforms two strings and a mode into a serializable comparison model.
2. `DiffResult.jsx` renders that model without owning editor state.
3. `TextComparisonPage.jsx` owns the editors, mode, validation state, and actions.
4. `TextComparisonPage.css` defines the responsive Arvenilo workbench and result presentation.

The comparison engine will use the maintained `diff` package rather than a custom algorithm:

- line-level differences determine aligned result rows;
- consecutive removed and added line groups are paired by position;
- surplus lines receive an empty placeholder on the opposite side;
- changed line pairs receive word-level or character-level token comparison;
- unchanged line pairs remain unsegmented;
- newline boundaries are represented by rows and are not duplicated in segment text.

The utility model contains result rows with left and right segment arrays. Each segment has `value` and `type`, where type is `unchanged`, `removed`, or `added`. Placeholder sides use empty segment arrays and an accessible placeholder label in the renderer.

Token counts sum added and removed comparison tokens. In Words mode, whitespace-only fragments do not increase the visible word counts; punctuation and symbol changes do. In Characters mode, every changed Unicode code point, including whitespace, contributes to the counts.

## Limits and Error Handling

Each editor accepts at most 100,000 JavaScript string code units. The browser enforces this through `maxLength`, and the comparison utility rejects longer programmatic input with a stable error result.

Validation states are specific and actionable:

- if either input is empty, the interface identifies which text is required;
- if an input exceeds the limit, the interface explains the 100,000-character maximum;
- if both inputs are identical, the result says **No differences found** and renders the unchanged aligned content.

Unexpected comparison failures are caught by the page boundary around the comparison action. The entered content remains available, and the user sees a concise retry message rather than a blank result.

## App Integration

`appRegistry.jsx` will register Text Comparison as:

- category: `Developer utility`;
- status: `available`;
- accent: `violet`;
- authentication: not required;
- path: `/text-comparison`.

The home page will receive the utility automatically through the existing registry-driven card list and route generation. A dedicated comparison icon will distinguish it from Text Formatter.

Existing in-progress workspace changes are preserved. Registry and route tests will be extended from their current working-tree state rather than overwritten.

## Testing

Utility tests will cover:

- identical text;
- a single word replacement;
- punctuation changes;
- character-level changes;
- whitespace changes in character mode;
- multiline insertions and removals;
- paired replacement lines;
- surplus-line placeholders;
- Unicode code points;
- added and removed token counts;
- the 100,000-character boundary.

Component tests will cover:

- both labeled editors;
- Words as the default mode;
- the disabled initial Compare texts action;
- comparison after both inputs are entered;
- switching to Characters;
- clearing stale results after input or mode changes;
- the identical state;
- Clear all;
- public route availability;
- registry metadata.

Before completion, the full test suite, linter, and production build must pass. The page will also be inspected in a browser at desktop and mobile widths for alignment, horizontal result scrolling, focus visibility, and both existing theme modes.

## Success Criteria

The feature is complete when a user can:

1. Open Text Comparison without signing in.
2. Enter prose or code in both editors.
3. Compare by words or exact characters.
4. Identify additions and removals in aligned side-by-side output.
5. Understand identical and validation states without relying on color.
6. Use the complete flow by keyboard at mobile and desktop widths.
