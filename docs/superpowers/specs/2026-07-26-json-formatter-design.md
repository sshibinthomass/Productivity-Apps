# JSON Formatter Design

## Goal

Add a public JSON Formatter utility to the Arvenilo Productivity Apps network. The tool must find JSON errors, offer two levels of repair, format valid or repaired JSON, keep both editors synchronized, copy the result, and show the formatted editor at full size.

## Product experience

The page uses the existing Arvenilo shell, typography, spacing, mint, violet, and gold accents, and the current light and dark themes. Its main surface is a focused two-editor workbench:

- **Input JSON** on the left accepts pasted or typed source text.
- **Formatted JSON** on the right displays indented JSON and remains editable.
- A status area reports whether the document is valid, how many errors were found, and which repairs were applied.
- The primary toolbar provides **Safe fix**, **Deep fix**, **Copy JSON**, **Full screen**, **Sample**, **Clear**, and an indentation selector.

The workbench stacks vertically on narrow screens. Controls retain visible keyboard focus, touch-friendly targets, and accessible names.

## Repair modes

### Safe fix

Safe fix repairs syntax that has one clear interpretation:

- JavaScript-style line and block comments
- single-quoted strings
- unquoted object keys
- trailing commas
- Python-style `True`, `False`, and `None`

It must not invent missing values or restructure the document.

### Deep fix

Deep fix performs all safe repairs and may additionally infer:

- missing commas between adjacent properties or array values
- missing closing braces and brackets at the end of the document
- common mismatched closing delimiters when the intended nesting is clear

Every inferred change is listed in the repair summary. If a remaining error is ambiguous, the original text is preserved and the error is reported instead of silently changing data.

## Synchronization

Both editors are writable and update each other automatically.

- When the input editor contains valid JSON, the formatted editor updates immediately using the selected indentation.
- When the formatted editor is edited, its text is mirrored to the input editor immediately. Valid edits remain formatted; invalid in-progress edits remain visible and are reported without deleting text.
- Repair actions replace both editors with the same valid, formatted JSON.
- Changing indentation reformats the last valid document without changing its data.
- The active editor must not unexpectedly rewrite beneath the user's cursor.

## Validation and errors

Validation runs locally in the browser. No JSON leaves the device.

For invalid JSON, the page shows:

- a clear invalid status
- the best available line and column
- a concise explanation
- a visual marker on the affected line
- an error list when more than one recoverable issue is detected

The formatted editor retains its last valid formatted result while invalid source is being typed from the input side. If the formatted side itself becomes invalid, both editors show that in-progress text until it becomes valid or is repaired.

Empty input is a neutral ready state rather than an error.

## Full-size view and copying

Full screen opens the formatted editor in an accessible modal-like overlay that fills the viewport. The overlay preserves editing, synchronization, copy, validity status, and a clear exit control. Escape closes it and focus returns to the trigger.

Copy JSON copies the current valid formatted document. It is disabled when there is no valid document. Successful copying produces a short confirmation; failure produces an actionable message.

## Architecture

The feature follows the existing registry-driven React/Vite structure:

- A registry entry exposes `/json-formatter` as a public available app.
- A focused JSON utility module owns parsing, line/column extraction, formatting, safe repair, deep repair, and repair reports.
- A page component owns editor state, synchronization origin, repair actions, copy feedback, indentation, and full-screen state.
- A page stylesheet implements the Arvenilo workbench and responsive presentation.
- A small icon component represents the formatter on the home-page app card.

No external editor or parser dependency is required. Repair behavior is implemented as deterministic local transformations and validated with `JSON.parse` after each repair stage.

## Testing

Unit tests cover:

- valid formatting and indentation
- line and column extraction
- every safe repair category
- deep missing-comma and closing-delimiter repair
- ambiguous invalid JSON remaining invalid
- repair report contents

Component tests cover:

- registry routing
- live input-to-formatted synchronization
- formatted-to-input synchronization
- invalid-state preservation
- both repair actions
- copy behavior
- full-screen opening and closing
- indentation changes
- clearing and sample loading

The final verification runs the focused tests, the full test suite, lint, and the production build.

