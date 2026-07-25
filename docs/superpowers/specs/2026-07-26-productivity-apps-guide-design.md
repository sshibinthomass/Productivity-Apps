# Productivity Apps Repository Guide Design

Date: 2026-07-26
Status: Approved for implementation

## Goal

Create a durable onboarding and implementation guide for developers and
future coding agents working in the Productivity Apps repository. The guide
must explain what the project is, how its sub-app architecture works, and the
required process for adding or changing an app without breaking GitHub Pages.

## Deliverables

- Create `PRODUCTIVITY_APPS_GUIDE.md` at the repository root.
- Add a short link to the guide from `README.md`.
- Do not add a website route, home-page card, Codex skill, generated asset, or
  runtime dependency.

## Audience

The guide is for a contributor who understands React but has no prior context
about this repository. It must provide enough project-specific information to
implement a new sub-app without rediscovering the architecture.

## Source of Truth

The guide describes current conventions, but source code remains authoritative:

- `src/config/appRegistry.jsx` defines the sub-app catalog, home-page cards,
  and routes.
- `src/App.jsx` maps registry entries to React Router routes.
- `src/pages/HomePage.jsx` renders registered apps as cards.
- `vite.config.js`, `public/404.html`, and
  `.github/workflows/deploy-pages.yml` define GitHub Pages behavior.
- `package.json` defines supported quality commands and runtime versions.

The guide must explicitly tell contributors to inspect these files before
making architectural or deployment changes.

## Required Sections

### 1. Project Overview

Explain that Productivity Apps is one React/Vite application containing
multiple focused productivity tools. Each tool owns an isolated folder while
shared navigation, layout, configuration, and visual foundations remain
centralized.

State the project principles:

- one shell, many focused tools
- one folder per sub-app
- registry-driven cards and routes
- colocated app code and tests
- shared code only when genuinely reused
- static hosting compatible with GitHub Pages

### 2. Current Sub-App Catalog

Document the current registry entry for Multi Link Opener:

- ID: `multi-link-opener`
- route: `/multi-link-opener`
- production URL:
  `/Productivity-Apps/multi-link-opener`
- purpose: validate, normalize, and open multiple links with an optional delay

Explain that this catalog must be updated whenever `appRegistry.jsx` changes.

### 3. Architecture and Data Flow

Show the application flow in compact text:

```text
appRegistry.jsx
  -> HomePage app cards
  -> App.jsx routes
  -> src/apps/<app-name>/<AppName>Page.jsx
```

Explain the responsibilities of:

- `src/apps/`
- `src/components/`
- `src/components/icons/`
- `src/config/`
- `src/pages/`
- `src/styles/`
- `public/`
- `.github/workflows/`

### 4. Required Sub-App Structure

Use a concrete example named `text-cleaner`:

```text
src/apps/text-cleaner/
  TextCleanerPage.jsx
  TextCleanerPage.css
  TextCleanerPage.test.jsx
  textCleanerUtils.js
  textCleanerUtils.test.js
```

Clarify that helper files are optional and should exist only when logic can be
tested independently from the page component.

Define conventions:

- folders and routes use kebab-case
- React components use PascalCase
- helpers use camelCase
- tests sit beside the file they cover
- app-specific CSS stays in the app folder

### 5. App Registry Contract

Document every registry property:

- `id`
- `title`
- `description`
- `path`
- `icon`
- `accent`
- `component`

Include one complete example registry entry for `text-cleaner`. State that
registering the app supplies both its home card and route; contributors must
not duplicate route or card configuration elsewhere.

### 6. Adding a New Sub-App

Provide an ordered workflow:

1. Define the tool's focused purpose and behavior.
2. Create its folder and page component.
3. Keep business logic in testable helpers when appropriate.
4. Add app-specific styling and responsive behavior.
5. Add an icon only when the registry needs one.
6. Register the app once in `appRegistry.jsx`.
7. Add or update registry, component, helper, and route tests.
8. Run all quality commands.
9. Verify development and production-base routes.
10. Update the guide's current-app catalog.

### 7. Shared Versus App-Specific Code

Give a decision rule:

- keep code inside the app when only that app uses it
- move code to shared folders only after two or more apps need the same
  behavior or visual component

Discourage premature generic abstractions and unrelated refactoring.

### 8. Product and Engineering Standards

Document expectations for:

- accessible labels, keyboard operation, focus states, and status messaging
- responsive desktop and mobile layouts
- safe handling of browser APIs and user-provided input
- specific validation messages rather than silent failure
- no new dependencies unless they materially simplify the implementation
- test-driven behavior changes
- preserving unrelated user changes in a dirty worktree

### 9. Testing and Verification

Document the required commands:

```bash
npm run test:run
npm run lint
npm run build
```

Explain the repository's test split:

- helper behavior in `*.test.js`
- component/static markup in `*.test.jsx`
- registry contract in `src/config/appRegistry.test.jsx`
- real-browser checks for interactions, responsive layout, and console errors

### 10. Routing and GitHub Pages

Explain:

- local routes do not include the repository prefix
- production routes use `/Productivity-Apps/`
- Vite applies the production base
- `404.html` restores direct nested-route visits
- each push to `main` runs tests, lint, build, and Pages deployment
- a new sub-app must work on direct navigation and refresh

### 11. Definition of Done

Provide a checklist covering:

- isolated app folder
- registry entry
- card and route
- tests
- accessibility
- responsive behavior
- safe input/browser handling
- updated documentation
- test, lint, and build success
- production route verification
- clean Git state and successful GitHub Pages workflow

### 12. Common Mistakes

Include concise corrections for:

- adding a route without using the registry
- placing app-specific code in shared folders
- forgetting the GitHub Pages base path
- testing only the happy path
- opening browser tabs asynchronously without reserving them first
- skipping mobile and direct-route verification
- creating a dependency for logic that native browser APIs already support

## Style

- Use concise Markdown headings, lists, tables, and code blocks.
- Prefer exact repository paths and commands over general advice.
- Explain why a convention exists only when the reason prevents a likely
  mistake.
- Keep the document practical and scannable.
- Do not include implementation history, commit hashes, dates that will become
  stale, or conversation-specific details.
- Keep terminology consistent: repository, shell, sub-app, registry, route,
  card, and GitHub Pages.

## Maintenance

Every change that adds, removes, or renames a sub-app must update:

1. `src/config/appRegistry.jsx`
2. relevant tests
3. the Current Sub-App Catalog in `PRODUCTIVITY_APPS_GUIDE.md`

Changes to routing, build commands, Node requirements, repository name, or
deployment must update both the guide and `README.md`.

## Verification

Before publishing:

- verify all paths, registry fields, commands, and URLs against the repository
- scan the document for placeholders and stale example names
- confirm the README link resolves
- run `npm run test:run`, `npm run lint`, and `npm run build`
- run `git diff --check`

After pushing to `main`, confirm the GitHub Pages workflow succeeds. The new
guide itself does not require a website deployment check because it is not
rendered by the application.
