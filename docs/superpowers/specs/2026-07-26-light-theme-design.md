# Arvenilo Network Light Theme Design

**Date:** 2026-07-26  
**Status:** Approved for implementation

## Goal

Add a complete light theme to Arvenilo Network and make it the default
experience. Dark mode remains available through an explicit header control.
The selected mode must apply to every current route and persist across reloads.

## Theme Behavior

- New visitors start in light mode, regardless of their operating-system theme.
- The header exposes one two-state theme control on every route.
- In light mode, the control is labeled `Switch to dark mode`.
- In dark mode, the control is labeled `Switch to light mode`.
- Selecting dark mode stores `dark` in browser storage.
- Selecting light mode stores `light` in browser storage.
- A valid stored choice is restored before the application renders.
- Missing, inaccessible, or invalid stored data falls back safely to light mode.
- The active theme is represented by `data-theme="light"` or
  `data-theme="dark"` on the document root.
- The document `color-scheme` and browser theme color follow the active theme.

## Visual Direction

Light mode is a bright counterpart to the existing Arvenilo Precision Spatial
theme, not a separate visual identity.

- **Canvas:** Reality Mist (`#F4FBFA`) with a restrained white-to-mist field.
- **Primary text:** Spatial Ink (`#081D21`).
- **Raised surfaces:** Interface White (`#FFFFFF`).
- **Structure:** pale teal borders derived from Border Light (`#C9DADA`).
- **Signals:** Signal Mint (`#5EEAD4`), Digital Violet (`#7456F1`), and Anchor
  Gold (`#F4B942`) remain the semantic accent colors.
- **Secondary copy:** Context Slate (`#4D6265`) provides readable contrast on
  light surfaces.

The existing network map remains the signature element. In light mode its
canvas becomes a pale technical grid with darker paths and outlined nodes, so
the connected-system metaphor remains immediately recognizable.

Dark mode retains the existing visual presentation without changing its
established palette.

## Architecture

### Theme utility

A small theme module owns:

- the storage key and valid theme values;
- safe reading and writing of the stored preference;
- applying a theme to the document root and browser theme-color metadata.

The utility is independent of React so its fallback and DOM behavior can be
tested directly.

### Theme provider

A React context initializes from the stored value, defaulting to light. It
exposes the active theme and a `toggleTheme` action. Theme changes are applied
to the document and persisted through the utility.

The provider wraps the application near the root so the layout and every route
share one source of truth.

### Theme control

The global layout renders a compact theme button beside account navigation. It
uses a sun/moon visual indicator, a visible text label where space allows, and
an accessible name that describes the resulting action.

The control remains at least 44 by 44 pixels, exposes pressed state, supports
keyboard interaction, and has a visible focus treatment.

### Theme tokens

Existing raw role usage is consolidated behind semantic CSS variables for:

- page canvas and ambient grid;
- primary and secondary text;
- surface and raised surface;
- borders and paths;
- interactive controls;
- error states.

Dark values preserve the existing screen. Light values override those
semantic roles under `:root[data-theme="light"]`.

Component CSS uses the semantic roles so the home page, cards, authentication
surfaces, empty/error states, and Multi Link Opener work in either mode without
route-specific theme logic.

## Responsive Behavior

The theme control remains in the header at all viewport sizes. On narrow
screens its visible label may be hidden while the icon and accessible name
remain. The control must not displace the network-index link or authentication
actions outside the viewport.

## Failure Handling

Browser storage can be unavailable or throw in privacy-restricted contexts.
Theme initialization and toggling must continue to work in memory in that
case. Invalid stored values are ignored and replaced by the light default.

If the theme-color meta element is missing, theme application continues
without failing.

## Testing

Automated tests cover:

- light as the default with no stored preference;
- restoration of a stored dark or light preference;
- rejection of invalid stored values;
- safe behavior when storage access fails;
- application of document theme attributes and browser theme color;
- the theme control label, pressed state, and toggle behavior;
- persistence after toggling;
- availability of the theme control on the shared layout;
- preservation of existing application behavior.

Visual verification covers the home page and Multi Link Opener in both themes
at desktop and mobile widths. Contrast, focus visibility, hover states, form
fields, error messages, and the network graphic are checked in each mode.

## Out of Scope

- Automatic operating-system theme detection.
- A three-state light/dark/system selector.
- Account-level or server-side theme synchronization.
- New application features unrelated to presentation.
