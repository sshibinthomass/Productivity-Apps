# Multi-Link Opener: Conservative Link Preprocessing

Date: 2026-07-25
Status: Approved for implementation

## Goal

Make pasted link lists more forgiving of common copy-and-paste artifacts while keeping every correction predictable and visible. The app must never guess a different domain, silently discard unsafe content, or open a partial list when an input limit is exceeded.

## Scope

This change applies only to parsing and reporting in the Multi-Link Opener. The existing app routing, delay control, popup reservation strategy, and link-opening sequence remain unchanged.

## Processing Pipeline

Each nonblank input line is processed independently and in this order:

1. Preserve the trimmed line as the original value used in result messages.
2. Remove zero-width copy-and-paste characters: U+200B through U+200D, U+2060, and U+FEFF.
3. Remove one leading list marker (`-`, `*`, or U+2022 BULLET) only when the marker is followed by whitespace.
4. Trim the remaining value.
5. Remove one matching wrapper around the entire value:
   - single quotes
   - double quotes
   - angle brackets
   - parentheses
   - square brackets
6. Trim the unwrapped value.
7. Convert a protocol-relative URL such as `//example.com/path` to `https://example.com/path`.
8. If no scheme is present, prepend `https://`.
9. Parse the result with the platform `URL` implementation.
10. Serialize the parsed URL and use that normalized value for duplicate detection and opening.

Only one list marker and one wrapper pair are removed. The parser does not repair misspelled domains, remove arbitrary trailing punctuation, or infer missing parts beyond adding HTTPS.

## Validation Rules

The parser accepts only HTTP and HTTPS URLs with a nonblank hostname.

It rejects an entry with a specific reason when any of the following applies:

- The cleaned value is empty.
- The value looks like an email address rather than a web address.
- The value contains internal whitespace.
- The scheme is not HTTP or HTTPS.
- The parsed URL contains a username or password.
- The normalized URL is longer than 2,048 characters.
- The value cannot be parsed as a valid URL or has no hostname.

Localhost, IPv4 and IPv6 addresses, ports, query strings, fragments, and internationalized domain names remain valid when the platform URL parser accepts them.

## Input Limits

At most 100 nonblank entries may be submitted at once.

If the input contains more than 100 nonblank entries, the entire submission is rejected before any popup windows are reserved. The result panel explains the 100-entry limit. The app must not open the first 100 links and silently ignore the rest.

## Result Model

The parser result continues to expose:

- `validUrls`: unique, normalized URLs in input order
- `duplicateCount`: number of entries removed after normalization
- `entryCount`: number of nonblank input lines

It adds:

- `invalidEntries`: objects containing the original entry and a stable reason identifier
- `adjustedEntries`: objects containing the original entry and final normalized URL
- `limitError`: a message when the submission exceeds the entry limit, otherwise `null`

An entry is adjusted when its final normalized URL differs from its original trimmed value. Adjustments include removal of copy-and-paste artifacts, wrapper or list-marker cleanup, protocol-relative conversion, HTTPS insertion, and URL serialization.

Duplicate detection happens after normalization. A duplicate may therefore also appear in the adjusted-entry report, while only the first normalized occurrence is opened.

## User Interface

The existing result panel will display:

- the entry-limit error, when present
- each invalid entry with its specific reason
- adjusted entries as `original -> normalized`
- the existing opened, blocked, invalid, and duplicate counts

Adjusted entries should use a compact disclosure section when needed so long lists do not overwhelm the page. All result text must remain readable on mobile and available without relying on color alone.

Submitting an over-limit list opens no tabs. For an in-limit list, invalid entries are skipped and valid entries keep the existing immediate-first-link and configured-delay behavior.

## Reason Messages

The implementation should use stable internal reason identifiers and map them to concise user-facing text:

| Identifier | User-facing reason |
| --- | --- |
| `empty-after-cleanup` | Nothing remains after cleanup. |
| `email-address` | This looks like an email address, not a web link. |
| `internal-whitespace` | Web links cannot contain spaces. |
| `unsupported-protocol` | Only HTTP and HTTPS links are supported. |
| `credentials` | Links containing a username or password are not allowed. |
| `too-long` | This link exceeds the 2,048-character limit. |
| `invalid-url` | This is not a valid web address. |

## Testing

Automated tests will cover:

- zero-width character cleanup
- leading list-marker cleanup
- every supported matching wrapper
- protocol-relative and bare-domain normalization
- email-like input
- credential-bearing URLs
- internal whitespace
- unsupported schemes
- malformed and hostname-free URLs
- the URL length boundary
- the 100-entry boundary and all-or-nothing rejection
- normalized duplicates
- adjusted-entry reporting
- preservation of localhost, IP, port, query, fragment, and internationalized-domain support
- unchanged delayed-opening and popup-blocker behavior

The full test, lint, and production-build commands must pass before publishing.

## Compatibility and Deployment

No new runtime dependency is required. The implementation remains a static React/Vite application compatible with the existing GitHub Pages base path:

`https://sshibinthomass.github.io/Productivity-Apps/multi-link-opener`

After verification, the change can be committed to `main` and pushed so the existing GitHub Pages workflow deploys it.
