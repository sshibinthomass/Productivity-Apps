# Mini-Site Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated Firebase-backed builder where each user can create, customize, publish, and analyze up to five publicly viewable mini-sites.

**Architecture:** The existing React/Vite SPA gains protected dashboard, creation, editor, and analytics routes plus a standalone public renderer. Private drafts and analytics live below the owner's Firestore path; server-authoritative callable Functions enforce quotas, slugs, publishing, deletion, and public event recording; Cloud Storage separates private draft assets from public revision assets.

**Tech Stack:** React 19, React Router 7, Firebase JavaScript SDK 12, Cloud Firestore, Cloud Storage, Firebase App Check, second-generation callable Cloud Functions, Vitest, Testing Library, Firebase Emulator Suite, CSS.

## Global Constraints

- A Firebase user may own no more than five sites.
- Builder, creation, editing, publishing, deletion, and analytics require Google sign-in.
- Published mini-sites are publicly readable at `/s/:slug`.
- Slugs are lowercase ASCII, 3–40 characters, and globally unique.
- A site may contain at most 25 blocks, all of which may be link blocks.
- Uploads accept JPEG, PNG, WebP, or GIF images up to 5 MiB.
- Draft autosave waits 700 ms after the most recent edit.
- Publishing requires WCAG AA contrast for primary page text and link-button text.
- Public content is plain text; user-supplied HTML and scripts are never rendered.
- Public analytics failures never block rendering or navigation.
- Custom domains, billing, collaboration, embeds, uploaded fonts, and version history remain out of scope.

---

## File Map

### Domain and Firebase clients

- `src/apps/mini-site-builder/model/miniSiteModel.js` — constants, default model, normalization, immutable block operations.
- `src/apps/mini-site-builder/model/templates.js` — Creator, Portfolio, Minimal, Bold, and blank templates.
- `src/apps/mini-site-builder/model/validation.js` — slug, URL, block-limit, image, contrast, and publish validation.
- `src/apps/mini-site-builder/model/themeCss.js` — converts validated theme values to CSS custom properties.
- `src/apps/mini-site-builder/data/miniSiteRepository.js` — all browser Firestore, Storage, and callable Function calls.
- `src/apps/mini-site-builder/data/repositoryContext.jsx` — injectable repository boundary for UI tests.
- `src/auth/firebaseClient.js` — initialize and expose Firestore, Storage, Functions, and optional App Check alongside Auth.

### Shared rendering

- `src/apps/mini-site-builder/renderer/MiniSiteRenderer.jsx` — semantic renderer shared by live preview and public pages.
- `src/apps/mini-site-builder/renderer/MiniSiteRenderer.css` — site-owned variables and block styling isolated from the Arvenilo shell.
- `src/apps/mini-site-builder/PublicMiniSitePage.jsx` — exact-slug public read and analytics reporting.

### Management UI

- `src/apps/mini-site-builder/MiniSitesDashboardPage.jsx` — protected site list and quota UI.
- `src/apps/mini-site-builder/NewMiniSitePage.jsx` — protected template and blank-canvas creation.
- `src/apps/mini-site-builder/studio/MiniSiteStudioPage.jsx` — draft state, undo/redo, autosave, section routing, publishing.
- `src/apps/mini-site-builder/studio/StudioHeader.jsx` — save/publish state and history controls.
- `src/apps/mini-site-builder/studio/BlockList.jsx` — ordered block selection and actions.
- `src/apps/mini-site-builder/studio/ContentPanel.jsx` — block library and type-specific fields.
- `src/apps/mini-site-builder/studio/DesignPanel.jsx` — presets and custom theme controls.
- `src/apps/mini-site-builder/studio/SettingsPanel.jsx` — metadata, slug, unpublish, and delete controls.
- `src/apps/mini-site-builder/studio/AnalyticsPanel.jsx` — summary, daily trend, and per-link counts.
- `src/apps/mini-site-builder/studio/useDraftAutosave.js` — 700 ms revision-aware autosave state machine.
- `src/apps/mini-site-builder/MiniSiteBuilder.css` — dashboard, template, studio, responsive, and dialog styling.
- `src/apps/mini-site-builder/icons.jsx` — local builder icon set.

### Routes and documentation

- `src/App.jsx` — standalone public route plus protected nested builder routes.
- `src/config/appRegistry.jsx` — authenticated Mini-Site Builder card.
- `src/styles/global.css` — only shared layout hooks required for standalone route isolation.
- `README.md` — local Firebase setup, emulators, App Check, functions, and deployment.
- `.env.example` — App Check site key and Functions region.

### Firebase backend

- `firebase.json` — Firestore, Storage, Functions, and emulator configuration.
- `firestore.rules` — private drafts, public snapshots, private analytics, deny-by-default.
- `storage.rules` — owner draft uploads, public published reads, deny-by-default.
- `firestore.indexes.json` — required indexes, initially empty.
- `functions/package.json` — Node 22 ESM Functions package.
- `functions/src/domain.js` — backend input validation and public snapshot sanitization.
- `functions/src/miniSiteService.js` — dependency-injected lifecycle and event operations.
- `functions/src/index.js` — Admin initialization and v2 callable exports.
- `firebase-tests/rules.test.js` — Firestore and Storage emulator authorization tests.

---

### Task 1: Pure mini-site domain model and templates

**Files:**
- Create: `src/apps/mini-site-builder/model/miniSiteModel.js`
- Create: `src/apps/mini-site-builder/model/templates.js`
- Create: `src/apps/mini-site-builder/model/miniSiteModel.test.js`
- Create: `src/apps/mini-site-builder/model/templates.test.js`

**Interfaces:**
- Produces: `SITE_LIMIT`, `BLOCK_LIMIT`, `LINK_BLOCK_LIMIT`, `BLOCK_TYPES`, `createBlock(type)`, `createDraft({ name, slug, templateId })`, `normalizeDraft(value)`, `updateBlock(blocks, blockId, patch)`, `moveBlock(blocks, blockId, direction)`, `duplicateBlock(blocks, blockId)`, `removeBlock(blocks, blockId)`.
- Produces: `TEMPLATES`, `getTemplate(templateId)`, `cloneTemplate(templateId)`.

- [ ] **Step 1: Write failing model tests**

Cover a five-site constant, all eight block types, stable block IDs, a blank
draft with profile and link blocks, immutable update/move/duplicate/remove,
normalization of malformed input and a 25-block cap that also bounds links.

- [ ] **Step 2: Run the focused model tests**

Run: `npm run test:run -- src/apps/mini-site-builder/model/miniSiteModel.test.js src/apps/mini-site-builder/model/templates.test.js`

Expected: FAIL because the model and template modules do not exist.

- [ ] **Step 3: Implement the minimal domain model**

Use `crypto.randomUUID()` when present and a timestamp/random fallback in
tests. Block shapes must be explicit:

```js
{
  id: 'uuid',
  type: 'link',
  visible: true,
  content: { label: '', url: '', supportingText: '', icon: '' }
}
```

Templates must return deep clones and initialize only serializable values.

- [ ] **Step 4: Re-run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/model/miniSiteModel.test.js src/apps/mini-site-builder/model/templates.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the domain foundation**

```bash
git add src/apps/mini-site-builder/model
git commit -m "feat: add mini-site domain model"
```

### Task 2: Validation and theme conversion

**Files:**
- Create: `src/apps/mini-site-builder/model/validation.js`
- Create: `src/apps/mini-site-builder/model/themeCss.js`
- Create: `src/apps/mini-site-builder/model/validation.test.js`
- Create: `src/apps/mini-site-builder/model/themeCss.test.js`

**Interfaces:**
- Consumes: `BLOCK_LIMIT`, `LINK_BLOCK_LIMIT`, `normalizeDraft`.
- Produces: `normalizeSlug(value)`, `validateSlug(value)`, `validateLinkUrl(value)`, `validateImageFile(file)`, `contrastRatio(foreground, background)`, `validateDraft(draft)`, `validateForPublish(draft)`, `sanitizePublishedSite(draft, publicAssetUrls)`.
- Produces: `themeToCssVariables(theme)`.

- [ ] **Step 1: Write failing validation tests**

Test reserved words, repeated/edge hyphens, unsupported URL schemes,
JavaScript/data URLs, accepted web/mail/tel URLs, image type/size, black-white
contrast ratio, block limits, missing alt text, publish-only required fields,
contrast failures, and removal of owner/private metadata from snapshots.

- [ ] **Step 2: Verify the tests fail**

Run: `npm run test:run -- src/apps/mini-site-builder/model/validation.test.js src/apps/mini-site-builder/model/themeCss.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement validation and CSS-variable conversion**

Return validation results as:

```js
{ valid: boolean, errors: { fieldPath: 'Human-readable message' } }
```

`themeToCssVariables` returns only allowlisted `--mini-*` properties. It must
never pass arbitrary object keys into inline styles.

- [ ] **Step 4: Re-run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/model/validation.test.js src/apps/mini-site-builder/model/themeCss.test.js`

Expected: PASS.

- [ ] **Step 5: Commit validation**

```bash
git add src/apps/mini-site-builder/model
git commit -m "feat: validate mini-site content and themes"
```

### Task 3: Firebase browser services and repository boundary

**Files:**
- Modify: `src/auth/firebaseClient.js`
- Modify: `src/auth/firebaseClient.test.js`
- Create: `src/apps/mini-site-builder/data/miniSiteRepository.js`
- Create: `src/apps/mini-site-builder/data/miniSiteRepository.test.js`
- Create: `src/apps/mini-site-builder/data/repositoryContext.jsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Firebase app/auth initialization and `normalizeDraft`.
- Produces client services: `db`, `storage`, `functions`, `appCheck`.
- Produces repository methods: `listSites(uid)`, `getDraft(uid, siteId)`,
  `saveDraft(uid, siteId, draft, expectedRevision)`, `getPublished(slug)`,
  `createSite(input)`, `duplicateSite(input)`, `changeSlug(input)`,
  `publishSite(siteId)`, `unpublishSite(siteId)`, `deleteSite(input)`,
  `uploadDraftAsset(input)`, `getAnalytics(uid, siteId)`,
  `recordEvent(input)`.
- Produces: `MiniSiteRepositoryProvider` and `useMiniSiteRepository()`.

- [ ] **Step 1: Extend Firebase client tests first**

Assert that valid configuration initializes one shared app and returns Auth,
Firestore, Storage, and region-aware Functions. Assert App Check initializes
only when `VITE_FIREBASE_APP_CHECK_SITE_KEY` is present and never breaks auth
when absent in local tests.

- [ ] **Step 2: Write repository contract tests with a fake Firebase adapter**

Test owner paths, exact public slug reads, callable payloads, upload path/type,
revision conflict mapping, and friendly error mapping.

- [ ] **Step 3: Run focused tests to verify failure**

Run: `npm run test:run -- src/auth/firebaseClient.test.js src/apps/mini-site-builder/data/miniSiteRepository.test.js`

Expected: FAIL for missing services and repository.

- [ ] **Step 4: Implement modular Firebase services**

Use `getFirestore(app)`, `getStorage(app)`, `getFunctions(app, region)`, and:

```js
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(siteKey),
  isTokenAutoRefreshEnabled: true,
})
```

Keep SDK calls behind an injectable adapter so unit tests never require a live
Firebase project.

- [ ] **Step 5: Re-run focused tests**

Run: `npm run test:run -- src/auth/firebaseClient.test.js src/apps/mini-site-builder/data/miniSiteRepository.test.js`

Expected: PASS.

- [ ] **Step 6: Commit browser Firebase integration**

```bash
git add src/auth src/apps/mini-site-builder/data .env.example
git commit -m "feat: add mini-site Firebase repository"
```

### Task 4: Callable backend lifecycle and analytics service

**Files:**
- Create: `functions/package.json`
- Create: `functions/src/domain.js`
- Create: `functions/src/miniSiteService.js`
- Create: `functions/src/index.js`
- Create: `functions/src/domain.test.js`
- Create: `functions/src/miniSiteService.test.js`

**Interfaces:**
- Consumes the private draft, slug, published snapshot, quota, asset, and
  analytics paths from the design.
- Produces service functions: `createMiniSiteService(deps)` with
  `createMiniSite`, `duplicateMiniSite`, `changeMiniSiteSlug`,
  `publishMiniSite`, `unpublishMiniSite`, `deleteMiniSite`, and
  `recordMiniSiteEvent`.
- Produces v2 callable exports with the same names.

- [ ] **Step 1: Write pure backend-domain tests**

Test callable input types, required auth UID, slug rules, template IDs, public
snapshot allowlisting, analytics event types, block ID validation, and
confirmation-name matching.

- [ ] **Step 2: Write service tests against an in-memory dependency**

Test atomic create at counts 0 and 4, rejection at 5, duplicate limit, slug
collision, owner denial, atomic slug replacement, publish sanitization,
unpublish retaining reservation, cascade delete/count decrement, view/click
increments, unknown link rejection, and event-ID deduplication.

- [ ] **Step 3: Run backend tests to verify failure**

Run: `npm run test:run -- functions/src/domain.test.js functions/src/miniSiteService.test.js`

Expected: FAIL because backend modules do not exist.

- [ ] **Step 4: Implement the dependency-injected service**

The service accepts:

```js
{
  runTransaction,
  getDraft,
  listReferencedAssets,
  copyAssetToPublic,
  deleteAssetPrefix,
  now,
}
```

Management methods reject missing auth before reading data. Event recording
uses an event receipt keyed by a SHA-256 digest of `slug:eventId:type:blockId`,
with an expiry timestamp.

- [ ] **Step 5: Export second-generation callables**

Use:

```js
onCall({ region: 'europe-west1', enforceAppCheck: true }, handler)
```

Management handlers additionally require `request.auth?.uid`. Development
emulator configuration may set App Check debug tokens; production enforcement
stays enabled.

- [ ] **Step 6: Run backend tests**

Run: `npm run test:run -- functions/src/domain.test.js functions/src/miniSiteService.test.js`

Expected: PASS.

- [ ] **Step 7: Install Functions dependencies and commit**

Run: `npm --prefix functions install`

```bash
git add functions
git commit -m "feat: add mini-site lifecycle functions"
```

### Task 5: Firebase rules and emulator configuration

**Files:**
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `storage.rules`
- Create: `firestore.indexes.json`
- Create: `firebase-tests/rules.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes the paths and immutable server-owned fields defined by Tasks 3–4.
- Produces scripts: `test:firebase` and `emulators`.

- [ ] **Step 1: Install emulator test tooling**

Run: `npm install --save-dev @firebase/rules-unit-testing firebase-tools`

- [ ] **Step 2: Write failing Firestore and Storage rule tests**

Cover owner get/list/update, other-user denial, signed-out denial, client
create/delete denial, server-field mutation denial, exact public get, public
list denial, slug denial, analytics owner read/write denial, image owner
upload, MIME/size rejection, public asset read, and public asset write denial.

- [ ] **Step 3: Add Firebase configuration and deny-by-default rules**

Use separate `allow get` and `allow list` clauses for public snapshots.
Draft updates use `diff().affectedKeys().hasOnly(...)` to restrict clients to
editable draft fields. All unmatched paths are denied.

- [ ] **Step 4: Run emulator tests**

Run: `npm run test:firebase`

Expected: PASS with Firestore and Storage emulators.

- [ ] **Step 5: Commit rules**

```bash
git add firebase.json firestore.rules storage.rules firestore.indexes.json firebase-tests package.json package-lock.json
git commit -m "feat: secure mini-site Firebase data"
```

### Task 6: Shared renderer and standalone public route

**Files:**
- Create: `src/apps/mini-site-builder/renderer/MiniSiteRenderer.jsx`
- Create: `src/apps/mini-site-builder/renderer/MiniSiteRenderer.css`
- Create: `src/apps/mini-site-builder/renderer/MiniSiteRenderer.test.jsx`
- Create: `src/apps/mini-site-builder/PublicMiniSitePage.jsx`
- Create: `src/apps/mini-site-builder/PublicMiniSitePage.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: normalized draft/published models, `themeToCssVariables`,
  `getPublished(slug)`, and `recordEvent(input)`.
- Produces: `<MiniSiteRenderer site mode="preview|public" onLinkClick />`.
- Produces: public `/s/:slug` route outside `Layout`.

- [ ] **Step 1: Write failing renderer tests**

Test all eight block types, hidden blocks, semantic heading levels, decorative
versus described images, safe URL handling, `noopener noreferrer`, CSS
variables, and absence of raw HTML interpretation.

- [ ] **Step 2: Write failing public-page and route tests**

Test loading, exact slug lookup, missing/unpublished state, view event once,
click event without delayed navigation, analytics failure tolerance, and no
Arvenilo header/footer around `/s/:slug`.

- [ ] **Step 3: Run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/renderer src/apps/mini-site-builder/PublicMiniSitePage.test.jsx src/App.test.jsx`

Expected: FAIL because renderer/page/routes do not exist.

- [ ] **Step 4: Implement renderer and public route**

The renderer maps known block types only. Unknown blocks return `null`.
Public page view reporting uses a session-scoped event ID and a ref guard;
errors are swallowed after optional development logging.

- [ ] **Step 5: Re-run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/renderer src/apps/mini-site-builder/PublicMiniSitePage.test.jsx src/App.test.jsx`

Expected: PASS.

- [ ] **Step 6: Commit public rendering**

```bash
git add src/apps/mini-site-builder/renderer src/apps/mini-site-builder/PublicMiniSitePage* src/App*
git commit -m "feat: render public mini-sites"
```

### Task 7: Dashboard and site creation

**Files:**
- Create: `src/apps/mini-site-builder/icons.jsx`
- Create: `src/apps/mini-site-builder/MiniSitesDashboardPage.jsx`
- Create: `src/apps/mini-site-builder/MiniSitesDashboardPage.test.jsx`
- Create: `src/apps/mini-site-builder/NewMiniSitePage.jsx`
- Create: `src/apps/mini-site-builder/NewMiniSitePage.test.jsx`
- Create: `src/apps/mini-site-builder/MiniSiteBuilder.css`
- Modify: `src/config/appRegistry.jsx`
- Modify: `src/config/appRegistry.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `SITE_LIMIT`, `TEMPLATES`, repository lifecycle methods, shared
  auth, and protected routing.
- Produces protected routes `/mini-sites` and `/mini-sites/new`.

- [ ] **Step 1: Write failing dashboard tests**

Test protected access, empty state, skeleton, error/retry, status labels,
analytics summary, `N of 5`, limit-disabled create/duplicate, public link, and
confirmed deletion.

- [ ] **Step 2: Write failing creation tests**

Test all five template choices, template keyboard selection, name/slug
validation, generated slug suggestion, unavailable slug error, backend quota
error, and navigation to the created editor.

- [ ] **Step 3: Run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/MiniSitesDashboardPage.test.jsx src/apps/mini-site-builder/NewMiniSitePage.test.jsx src/config/appRegistry.test.jsx src/App.test.jsx`

Expected: FAIL because pages and routes do not exist.

- [ ] **Step 4: Implement dashboard, template gallery, registry card, and routes**

Use plain buttons and native form submission. Do not optimistically delete
cards before the function confirms deletion. Keep quota messaging visible near
the main action.

- [ ] **Step 5: Add intentional responsive styling**

Use the existing Sora/Inter/IBM Plex font system and mint/violet/gold tokens
for management UI. Template thumbnails must be generated from template theme
values rather than screenshots.

- [ ] **Step 6: Re-run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/MiniSitesDashboardPage.test.jsx src/apps/mini-site-builder/NewMiniSitePage.test.jsx src/config/appRegistry.test.jsx src/App.test.jsx`

Expected: PASS.

- [ ] **Step 7: Commit management entry points**

```bash
git add src/apps/mini-site-builder src/config src/App.jsx src/App.test.jsx
git commit -m "feat: add mini-site dashboard and creation"
```

### Task 8: Live Studio state, content editing, and autosave

**Files:**
- Create: `src/apps/mini-site-builder/studio/useDraftAutosave.js`
- Create: `src/apps/mini-site-builder/studio/useDraftAutosave.test.jsx`
- Create: `src/apps/mini-site-builder/studio/StudioHeader.jsx`
- Create: `src/apps/mini-site-builder/studio/BlockList.jsx`
- Create: `src/apps/mini-site-builder/studio/ContentPanel.jsx`
- Create: `src/apps/mini-site-builder/studio/MiniSiteStudioPage.jsx`
- Create: `src/apps/mini-site-builder/studio/MiniSiteStudioPage.test.jsx`
- Modify: `src/apps/mini-site-builder/MiniSiteBuilder.css`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: model block operations, repository `getDraft/saveDraft`, renderer,
  and `MiniSiteRepositoryProvider`.
- Produces protected `/mini-sites/:siteId/edit`.
- Produces `useDraftAutosave({ draft, revision, save, delay: 700 })` returning
  `{ status, error, retry, markSavedRevision }`.

- [ ] **Step 1: Write failing autosave tests with fake timers**

Test no initial save, one save after 700 ms, timer reset, newest revision wins,
stale response ignored, retry after error, and cleanup after unmount.

- [ ] **Step 2: Write failing studio interaction tests**

Test loading/ownership error, section navigation, selected block editor, all
block types, add/edit/move/hide/duplicate/delete, 40/25 limit messages,
undo/redo, save-state labels, unsaved route prompt, and Edit/Preview mobile
tabs.

- [ ] **Step 3: Run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/studio`

Expected: FAIL because studio modules do not exist.

- [ ] **Step 4: Implement revision-aware autosave and reducer history**

Keep history to 50 states. Do not add save-state responses to history. Route
blocking activates only while status is `unsaved`, `saving`, or `error`.

- [ ] **Step 5: Implement content editors and preview**

Use stable IDs as React keys. Each block field displays its own validation
message. Move up/down buttons remain visible to assistive technology even if
pointer drag styling is added.

- [ ] **Step 6: Re-run focused and route tests**

Run: `npm run test:run -- src/apps/mini-site-builder/studio src/App.test.jsx`

Expected: PASS.

- [ ] **Step 7: Commit Live Studio content flow**

```bash
git add src/apps/mini-site-builder/studio src/apps/mini-site-builder/MiniSiteBuilder.css src/App*
git commit -m "feat: add mini-site live studio"
```

### Task 9: Design controls, uploads, settings, and publishing

**Files:**
- Create: `src/apps/mini-site-builder/studio/DesignPanel.jsx`
- Create: `src/apps/mini-site-builder/studio/DesignPanel.test.jsx`
- Create: `src/apps/mini-site-builder/studio/SettingsPanel.jsx`
- Create: `src/apps/mini-site-builder/studio/SettingsPanel.test.jsx`
- Modify: `src/apps/mini-site-builder/studio/ContentPanel.jsx`
- Modify: `src/apps/mini-site-builder/studio/MiniSiteStudioPage.jsx`
- Modify: `src/apps/mini-site-builder/studio/MiniSiteStudioPage.test.jsx`
- Modify: `src/apps/mini-site-builder/MiniSiteBuilder.css`

**Interfaces:**
- Consumes: templates, contrast/publish validation, repository asset/lifecycle
  methods.
- Produces editable theme, image upload, slug change, publish/unpublish, and
  typed delete confirmation flows.

- [ ] **Step 1: Write failing design tests**

Test preset application without content loss, all custom theme fields, color
validation, live contrast warnings, alignment/density/button/profile controls,
and reset to current template.

- [ ] **Step 2: Write failing settings and upload tests**

Test metadata edits, valid image preview/upload, rejected MIME/size, required
alt text, upload error retention, slug change, publish validation, publish
success, unpublish, typed delete, and navigation after deletion.

- [ ] **Step 3: Run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/studio/DesignPanel.test.jsx src/apps/mini-site-builder/studio/SettingsPanel.test.jsx src/apps/mini-site-builder/studio/MiniSiteStudioPage.test.jsx`

Expected: FAIL for missing panels and flows.

- [ ] **Step 4: Implement design controls and uploads**

Use native color inputs paired with editable hex text inputs. Upload only
after local validation; keep the returned private asset descriptor in the
draft until publishing replaces it in the public snapshot.

- [ ] **Step 5: Implement settings and lifecycle actions**

Disable publish while saving or invalid. Surface field-level publish errors
and focus the first invalid section. Require exact site-name confirmation for
delete.

- [ ] **Step 6: Re-run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/studio`

Expected: PASS.

- [ ] **Step 7: Commit design and publishing**

```bash
git add src/apps/mini-site-builder
git commit -m "feat: customize and publish mini-sites"
```

### Task 10: Analytics UI

**Files:**
- Create: `src/apps/mini-site-builder/studio/AnalyticsPanel.jsx`
- Create: `src/apps/mini-site-builder/studio/AnalyticsPanel.test.jsx`
- Modify: `src/apps/mini-site-builder/studio/MiniSiteStudioPage.jsx`
- Modify: `src/apps/mini-site-builder/MiniSiteBuilder.css`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `getAnalytics(uid, siteId)` returning
  `{ summary, days: Array<{ date, views, clicks }>, linkClicks }`.
- Produces protected `/mini-sites/:siteId/analytics` and in-studio analytics
  section.

- [ ] **Step 1: Write failing analytics tests**

Test loading, empty, error/retry, totals, latest 30 daily values, accessible
CSS bar chart labels, per-link table matched to current labels, deleted-link
fallback labels, and protected standalone route.

- [ ] **Step 2: Run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/studio/AnalyticsPanel.test.jsx src/App.test.jsx`

Expected: FAIL because the analytics panel/route do not exist.

- [ ] **Step 3: Implement analytics presentation**

The chart is progressive enhancement: every bar has an accessible value label
and the same data appears in a compact table on narrow screens. No charting
dependency is added.

- [ ] **Step 4: Re-run focused tests**

Run: `npm run test:run -- src/apps/mini-site-builder/studio/AnalyticsPanel.test.jsx src/App.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit analytics**

```bash
git add src/apps/mini-site-builder/studio src/apps/mini-site-builder/MiniSiteBuilder.css src/App*
git commit -m "feat: show mini-site analytics"
```

### Task 11: Documentation, accessibility, and full verification

**Files:**
- Modify: `README.md`
- Modify: `src/apps/mini-site-builder/MiniSiteBuilder.css`
- Modify: `src/apps/mini-site-builder/renderer/MiniSiteRenderer.css`
- Modify: any failing source/test files discovered by verification.

**Interfaces:**
- Consumes all previous tasks.
- Produces a documented, lint-clean, production-building feature.

- [ ] **Step 1: Document local and Firebase setup**

Document `.env.local`, Google Auth, Firestore, Storage, App Check debug token,
Functions region, Blaze requirement, `npm run emulators`,
`npm run test:firebase`, function deployment, rules deployment, and GitHub
Pages configuration.

- [ ] **Step 2: Audit keyboard and responsive behavior**

Verify 320 px builder, 280 px public renderer, 900 px Live Studio collapse,
focus visibility, dialog focus return, status live regions, semantic headings,
reduced motion, and 200% zoom.

- [ ] **Step 3: Run complete unit tests**

Run: `npm run test:run`

Expected: all tests pass.

- [ ] **Step 4: Run Firebase emulator tests**

Run: `npm run test:firebase`

Expected: all Firestore, Storage, and Functions integration tests pass.

- [ ] **Step 5: Run lint**

Run: `npm run lint`

Expected: zero errors.

- [ ] **Step 6: Run production build**

Run: `npm run build`

Expected: Vite production build succeeds.

- [ ] **Step 7: Run browser smoke test**

Run the development server and verify: sign-in redirect, dashboard, create,
customize, publish, public visit, click reporting, analytics, unpublish, and
delete. Capture desktop and mobile screenshots and inspect for overflow or
unreadable contrast.

- [ ] **Step 8: Commit final integration**

```bash
git add README.md src firebase.json firestore.rules storage.rules functions firebase-tests package.json package-lock.json
git commit -m "feat: complete Firebase mini-site builder"
```
