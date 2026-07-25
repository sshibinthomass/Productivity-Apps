# Productivity Apps Repository Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a practical root-level guide that explains the Productivity Apps architecture, current sub-apps, required folder and registry conventions, verification standards, and GitHub Pages workflow.

**Architecture:** `PRODUCTIVITY_APPS_GUIDE.md` is the detailed contributor-facing source for project conventions, while `README.md` remains the concise entry point and links to the guide. The guide describes current code as the authority and introduces no runtime behavior, route, card, dependency, or generated asset.

**Tech Stack:** Markdown, React 19.2.8 project conventions, Vite 8.1.5, Vitest 4.1.10, ESLint 10.0.1, GitHub Actions, GitHub Pages

## Global Constraints

- Create `PRODUCTIVITY_APPS_GUIDE.md` at the repository root.
- Add one short guide link to `README.md`.
- Do not add a website route, home-page card, Codex skill, generated asset, or runtime dependency.
- Treat source code and `src/config/appRegistry.jsx` as authoritative.
- Use exact repository paths, commands, registry fields, and route examples.
- Keep the guide practical, scannable, and free of implementation history.
- Use `text-cleaner` as the future sub-app example.
- Document the current Multi Link Opener app and its production route.
- Require test, lint, build, browser, GitHub Pages, and documentation checks in the definition of done.

---

## File Map

- `PRODUCTIVITY_APPS_GUIDE.md`: complete contributor guide and new-sub-app contract.
- `README.md`: concise project introduction plus a link to the detailed guide.
- `docs/superpowers/specs/2026-07-26-productivity-apps-guide-design.md`: approved source requirements; read-only during implementation.

---

### Task 1: Create and Link the Repository Guide

**Files:**
- Create: `PRODUCTIVITY_APPS_GUIDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: current paths, registry fields, scripts, routes, and deployment behavior from the repository.
- Produces: a root-level guide reachable from the README.
- Produces no JavaScript API, route, component, dependency, or build configuration.

- [ ] **Step 1: Run the documentation baseline check and verify RED**

Run:

```powershell
if (-not (Test-Path -LiteralPath 'PRODUCTIVITY_APPS_GUIDE.md')) {
  throw 'PRODUCTIVITY_APPS_GUIDE.md is missing'
}

if (-not (Select-String -Path 'README.md' -SimpleMatch 'PRODUCTIVITY_APPS_GUIDE.md' -Quiet)) {
  throw 'README.md does not link to the repository guide'
}
```

Expected: FAIL with `PRODUCTIVITY_APPS_GUIDE.md is missing`.

- [ ] **Step 2: Create the guide with the exact section contract**

Create `PRODUCTIVITY_APPS_GUIDE.md` with this heading order:

```markdown
# Productivity Apps Guide

## What Productivity Apps Is
## Core Architecture
## Current Sub-Apps
## Repository Structure
## Sub-App Folder Contract
## App Registry Contract
## Adding a New Sub-App
## Shared Versus App-Specific Code
## Product and Engineering Standards
## Testing and Verification
## Routing and GitHub Pages
## Definition of Done
## Common Mistakes
## Keeping This Guide Current
```

Under `What Productivity Apps Is`, state:

- this is one React/Vite shell containing multiple focused tools
- each sub-app owns one folder
- the registry drives both its home card and route
- shared folders contain only genuinely reusable code
- production remains a static GitHub Pages application

Under `Core Architecture`, include:

```text
src/config/appRegistry.jsx
  -> src/pages/HomePage.jsx renders app cards
  -> src/App.jsx creates routes
  -> src/apps/<app-name>/<AppName>Page.jsx renders the tool
```

Name these authoritative files:

```text
src/config/appRegistry.jsx
src/App.jsx
src/pages/HomePage.jsx
vite.config.js
public/404.html
.github/workflows/deploy-pages.yml
package.json
```

Under `Current Sub-Apps`, document Multi Link Opener with:

```text
ID: multi-link-opener
Local route: /multi-link-opener
Production route: /Productivity-Apps/multi-link-opener
```

Describe its purpose as validating, normalizing, and opening multiple HTTP or
HTTPS links, with optional delayed navigation.

Under `Repository Structure`, document the responsibilities of:

```text
src/apps/
src/components/
src/components/icons/
src/config/
src/pages/
src/styles/
public/
.github/workflows/
```

Under `Sub-App Folder Contract`, include:

```text
src/apps/text-cleaner/
  TextCleanerPage.jsx
  TextCleanerPage.css
  TextCleanerPage.test.jsx
  textCleanerUtils.js
  textCleanerUtils.test.js
```

State that helper files are optional. Define kebab-case folders/routes,
PascalCase components, camelCase helpers, colocated tests, and app-local CSS.

Under `App Registry Contract`, explain `id`, `title`, `description`, `path`,
`icon`, `accent`, and `component`. Include this complete example:

```jsx
import TextCleanerPage from '../apps/text-cleaner/TextCleanerPage.jsx'
import TextIcon from '../components/icons/TextIcon.jsx'

{
  id: 'text-cleaner',
  title: 'Text Cleaner',
  description: 'Clean and normalize pasted text.',
  path: '/text-cleaner',
  icon: TextIcon,
  accent: 'coral',
  component: TextCleanerPage,
}
```

State explicitly that one registry entry supplies both the card and route.

Under `Adding a New Sub-App`, give this workflow:

1. Define one focused purpose and its behavior.
2. Create the app folder and page component.
3. Extract independently testable business logic only when needed.
4. Add app-local responsive styling.
5. Add a registry icon only when needed.
6. Register the app once.
7. Add helper, component, registry, and route coverage as applicable.
8. Run all quality commands.
9. Verify local and production-base routes.
10. Update the Current Sub-Apps section.

Under `Shared Versus App-Specific Code`, state that code stays inside an app
until at least two apps genuinely need the same behavior or visual component.
Discourage premature abstraction and unrelated refactoring.

Under `Product and Engineering Standards`, cover:

- labels, keyboard access, focus states, and understandable status messages
- desktop and mobile layouts
- validation and safe browser API use
- specific errors instead of silent failure
- native APIs before new dependencies
- test-driven behavior changes
- preservation of unrelated worktree changes

Under `Testing and Verification`, include:

```bash
npm run test:run
npm run lint
npm run build
```

Explain helper `*.test.js`, component `*.test.jsx`, registry contract, and
real-browser checks for interaction, responsiveness, direct routes, and
console errors.

Under `Routing and GitHub Pages`, explain:

- local routes omit the repository prefix
- production routes use `/Productivity-Apps/`
- Vite supplies the production base
- `public/404.html` restores direct nested routes
- pushes to `main` test, lint, build, and deploy
- every new route must survive direct navigation and refresh

Under `Definition of Done`, provide checkboxes for:

- isolated app folder
- registry entry
- home card and route
- focused tests
- accessible interactions and status
- responsive behavior
- safe input and browser handling
- updated Current Sub-Apps catalog
- passing test, lint, and build
- verified local and production routes
- clean Git state
- successful GitHub Pages workflow

Under `Common Mistakes`, correct:

- bypassing the registry for routes/cards
- moving app-local code into shared folders prematurely
- forgetting the Pages base
- testing only happy paths
- delaying `window.open` instead of reserving tabs synchronously
- skipping mobile or direct-route verification
- adding dependencies when browser APIs are sufficient

Under `Keeping This Guide Current`, require app catalog/test updates with
registry changes, and README/guide updates when routing, Node, build, repository
name, or deployment conventions change.

- [ ] **Step 3: Link the guide from README**

Add this paragraph immediately after the opening description:

```markdown
For the architecture, sub-app conventions, and new-tool checklist, see the
[Productivity Apps Guide](PRODUCTIVITY_APPS_GUIDE.md).
```

- [ ] **Step 4: Run the documentation check and verify GREEN**

Run:

```powershell
if (-not (Test-Path -LiteralPath 'PRODUCTIVITY_APPS_GUIDE.md')) {
  throw 'PRODUCTIVITY_APPS_GUIDE.md is missing'
}

if (-not (Select-String -Path 'README.md' -SimpleMatch 'PRODUCTIVITY_APPS_GUIDE.md' -Quiet)) {
  throw 'README.md does not link to the repository guide'
}

$requiredHeadings = @(
  '## What Productivity Apps Is',
  '## Core Architecture',
  '## Current Sub-Apps',
  '## Repository Structure',
  '## Sub-App Folder Contract',
  '## App Registry Contract',
  '## Adding a New Sub-App',
  '## Shared Versus App-Specific Code',
  '## Product and Engineering Standards',
  '## Testing and Verification',
  '## Routing and GitHub Pages',
  '## Definition of Done',
  '## Common Mistakes',
  '## Keeping This Guide Current'
)

foreach ($heading in $requiredHeadings) {
  if (-not (Select-String -Path 'PRODUCTIVITY_APPS_GUIDE.md' -SimpleMatch $heading -Quiet)) {
    throw "Missing guide heading: $heading"
  }
}
```

Expected: exit 0 with no output.

- [ ] **Step 5: Verify every factual reference**

Compare the finished guide against:

```powershell
Get-Content -Raw src\config\appRegistry.jsx
Get-Content -Raw src\App.jsx
Get-Content -Raw vite.config.js
Get-Content -Raw package.json
Get-Content -Raw .github\workflows\deploy-pages.yml
```

Confirm the guide contains no placeholder terms:

```powershell
$placeholderMatches = Select-String `
  -Path 'PRODUCTIVITY_APPS_GUIDE.md' `
  -Pattern '\b(TBD|TODO|FIXME|implement later)\b'

if ($placeholderMatches) {
  throw 'Guide contains placeholder language'
}
```

Expected: source details match and the placeholder scan exits 0.

- [ ] **Step 6: Run full repository verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, ESLint exits zero, Vite builds successfully, and
Git reports no whitespace errors.

- [ ] **Step 7: Commit the guide**

```bash
git add PRODUCTIVITY_APPS_GUIDE.md README.md
git commit -m "docs: add productivity apps guide"
```

---

### Task 2: Publish and Verify the Documentation Change

**Files:**
- Verify: `PRODUCTIVITY_APPS_GUIDE.md`
- Verify: `README.md`
- No additional source files should change.

**Interfaces:**
- Consumes: committed guide from Task 1.
- Produces: synchronized `main` and `origin/main`, with a successful GitHub Pages workflow.

- [ ] **Step 1: Confirm repository state**

Run:

```bash
git status --short --branch
git log --oneline -5
```

Expected: no uncommitted files; the guide and design/plan commits appear at
the top of `main`.

- [ ] **Step 2: Push main**

Run:

```bash
git push origin main
```

Expected: the guide commits are accepted by `origin/main`.

- [ ] **Step 3: Monitor GitHub Pages**

Run:

```bash
gh run list --workflow "Deploy to GitHub Pages" --branch main --limit 1
gh run watch <run-id> --exit-status
```

Expected: the build and deploy jobs both succeed.

- [ ] **Step 4: Confirm final synchronization**

Run:

```bash
git fetch origin
git rev-list --left-right --count origin/main...HEAD
git status --short --branch
```

Expected:

```text
0	0
## main...origin/main
```

---

## Final Verification

- [ ] `PRODUCTIVITY_APPS_GUIDE.md` exists at the repository root.
- [ ] `README.md` links to the guide.
- [ ] All fourteen required guide sections are present.
- [ ] Current Multi Link Opener facts match `appRegistry.jsx`.
- [ ] The `text-cleaner` example follows repository naming conventions.
- [ ] No website route, home-page card, dependency, or runtime behavior changed.
- [ ] `npm run test:run` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] `git diff --check` succeeds.
- [ ] GitHub Pages deployment succeeds.
- [ ] `main` and `origin/main` are synchronized.
