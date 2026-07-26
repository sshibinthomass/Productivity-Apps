# JSON Download Design

## Goal

Add a Download JSON action to the existing JSON Formatter so a valid formatted document can be saved as a local `.json` file.

## User experience

- Add **Download JSON** beside **Copy JSON** in the formatted editor.
- Add the same action to the full-screen formatted view.
- Disable Download JSON when the current document is empty or invalid.
- Keep the action visually consistent with the existing Arvenilo document controls.
- Report `JSON downloaded` through the existing feedback area after a successful download.
- Report `Download failed. Copy the JSON and save it manually.` if the browser cannot create the file.

## Filename

Use the user's local date and time when the action is triggered:

`formatted-YYYY-MM-DD-HHMMSS.json`

Each numeric component is zero-padded. For example, 26 July 2026 at 14:35:09 becomes:

`formatted-2026-07-26-143509.json`

## File behavior

The downloaded file contains the current valid formatted-editor text and uses MIME type `application/json`. The browser creates a temporary `Blob` object URL, triggers an anchor download, removes the temporary anchor, and revokes the object URL immediately afterward.

No server request, persistent storage, or new dependency is introduced.

## Architecture

- Add a pure `createJsonFilename(date)` helper beside the existing formatter utilities.
- Add a small `downloadJson(text, options)` browser helper that receives injectable URL, document, and clock dependencies for focused testing.
- The page calls `downloadJson(formattedText)` only when the existing `canCopy` valid-document condition is true.
- Copy and download share the same valid-document availability rule and feedback region.

## Testing

Utility tests verify:

- local datetime components and zero padding
- `.json` extension
- `application/json` Blob contents
- temporary anchor attributes and click
- object URL revocation and anchor cleanup

Component tests verify:

- Download JSON is disabled in the empty and invalid states
- a valid formatted document is passed to the download helper
- success and failure feedback
- Download JSON is present in the full-screen toolbar

Final verification runs the focused formatter tests, full test suite, lint, and production build.
