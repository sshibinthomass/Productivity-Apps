# Productivity App Shell Design

## Goal

Create a Vite and React application that acts as a home for multiple small
productivity tools. The home page lists every tool as a card, and each tool
lives in its own feature folder and has its own route.

The first tool is Multi Link Opener. It accepts multiple links, one per line,
and opens every valid link in a separate browser tab.

## Route Contract

The application is deployed as the `Productivity-Apps` GitHub Pages project:

- Home: `https://<username>.github.io/Productivity-Apps`
- Multi Link Opener:
  `https://<username>.github.io/Productivity-Apps/multi-link-opener`

Routes use `BrowserRouter` with the Vite base path. A GitHub Pages SPA fallback
restores client-side routes when someone opens or refreshes a nested URL
directly. URLs remain clean and do not use hash routing.

Locally, the corresponding routes are `/` and `/multi-link-opener`.

## Architecture

This is one React application with isolated feature folders:

```text
Productivity-Apps/
├── .github/workflows/
│   └── deploy-pages.yml
├── docs/superpowers/specs/
├── public/
│   └── 404.html
├── src/
│   ├── apps/
│   │   └── multi-link-opener/
│   │       ├── MultiLinkOpenerPage.jsx
│   │       ├── MultiLinkOpenerPage.css
│   │       ├── linkUtils.js
│   │       └── linkUtils.test.js
│   ├── components/
│   │   ├── AppCard.jsx
│   │   └── Layout.jsx
│   ├── config/
│   │   └── appRegistry.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── NotFoundPage.jsx
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

The app registry is the single source of truth for each tool's title,
description, icon, path, and page component. The router and home-page card grid
both consume the registry. Adding a future tool requires a feature folder and
one registry entry.

Shared layout components provide the site header, navigation, content width,
and card presentation. Tool-specific behavior and styles remain inside the
tool's folder.

## Home Page

The home page introduces the collection and displays a responsive grid of app
cards. The first card is Multi Link Opener. Selecting it navigates to
`/multi-link-opener`.

The visual direction is a clean, modern productivity dashboard with a strong
page title, concise supporting copy, generous spacing, accessible contrast,
clear focus states, and responsive layouts for desktop and mobile.

## Multi Link Opener

The tool page contains:

- A title and concise usage instructions.
- A large multiline textarea with one link per line.
- A primary "Open links" button.
- A clear/reset action.
- A live count of detected nonblank entries.
- An inline result summary after submission.

When the user selects "Open links":

1. Split the textarea on line breaks.
2. Trim whitespace and discard blank lines.
3. Add `https://` when a line has no URL protocol.
4. Validate each normalized value as an HTTP or HTTPS URL.
5. Remove duplicate normalized URLs while preserving input order.
6. Open every valid URL in a separate tab from the same user click.
7. Report opened, invalid, duplicate, and browser-blocked counts.

Unsupported protocols such as `javascript:`, `data:`, and `file:` are invalid.
Invalid entries are shown without attempting to open them. The textarea is
held in React state for the current page session; persistent storage is outside
this version's scope.

Browsers may block multiple tabs. The result message explains how to allow
pop-ups for the site when one or more `window.open` calls return a blocked
result. Opened pages receive `noopener,noreferrer` protection.

## GitHub Pages Deployment

Vite's production base is `/Productivity-Apps/`. Static asset paths and router
navigation are derived from that base rather than hardcoded at component
level.

The repository contains a GitHub Actions workflow using the official Pages
artifact and deployment actions. A push to the default branch builds the
application and deploys `dist`.

The public `404.html` fallback redirects an unknown GitHub Pages path to the
application entry while encoding the requested path. The entry page restores
that path with `history.replaceState` before React Router initializes. This
allows direct visits and refreshes on `/Productivity-Apps/multi-link-opener`.

## Error Handling and Accessibility

- The open action is disabled when there are no nonblank entries.
- Invalid lines remain visible and are listed in the result summary.
- A not-found page handles routes that are not in the registry.
- Form controls have visible labels and focus states.
- Status feedback uses an accessible live region.
- Keyboard interaction follows native button, link, and textarea behavior.
- Motion is restrained and respects reduced-motion preferences.

## Verification

Automated tests cover URL normalization, blank-line removal, validation,
deduplication, order preservation, and unsupported protocols.

Completion requires:

- Unit tests passing.
- Lint checks passing.
- A successful production build with the GitHub Pages base.
- Verification that built asset URLs include `/Productivity-Apps/`.
- Verification that the home and nested route work in a local production
  preview, including the nested-route restoration mechanism.
- A responsive visual check of the home page and Multi Link Opener page.

## Out of Scope

- User accounts or cloud synchronization.
- Permanent storage of entered links.
- Browser-extension behavior that bypasses pop-up policies.
- Additional productivity tools beyond the first registered card.
- A backend service.
