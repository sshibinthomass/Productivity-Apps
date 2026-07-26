# Mini-Site Builder Design

## Summary

Arvenilo Network will add an authenticated mini-site builder that lets a
signed-in user create, customize, publish, and analyze up to five independent
public mini-sites. The experience should be as approachable as a link-in-bio
tool while supporting richer modular content and substantially more visual
control.

Site management, editing, publishing, unpublishing, deletion, and analytics
are available only to the signed-in owner. A published site is intentionally
public at `/s/:slug` and does not require a visitor account.

The application will continue to use the existing React/Vite frontend and
Google sign-in. Cloud Firestore stores drafts, published snapshots, and
analytics. Cloud Storage stores uploaded images. Callable Cloud Functions
perform operations that require server-authoritative limits or public writes.
Deploying those functions requires a Firebase Blaze project.

## Product Goals

- Let a new user publish an attractive mini-site without design experience.
- Let experienced users start from a blank canvas and customize the result.
- Keep the common profile-and-links workflow fast while supporting modular
  content blocks.
- Allow each Firebase user to manage no more than five sites.
- Give every published site a stable, unique, user-selected public slug.
- Record useful page-view and link-click analytics without granting public
  Firestore write access.
- Keep private drafts and unpublished assets inaccessible to visitors.
- Preserve the existing Arvenilo design language in the management interface
  without forcing that design onto users' published sites.

## Non-Goals

The first release will not include:

- custom domains;
- billing, subscriptions, or paid feature tiers;
- team accounts or collaborative editing;
- third-party HTML, script, video, or commerce embeds;
- uploaded custom fonts;
- version history or multi-device conflict resolution beyond last accepted
  draft write;
- user-created template publishing;
- visitor accounts, comments, contact-form storage, or email capture.

## Routes and Access

| Route | Access | Purpose |
| --- | --- | --- |
| `/mini-sites` | Signed-in users | Dashboard of sites, statuses, limits, and summary analytics |
| `/mini-sites/new` | Signed-in users | Template gallery and blank-canvas entry |
| `/mini-sites/:siteId/edit` | Owning signed-in user | Live Studio editor |
| `/mini-sites/:siteId/analytics` | Owning signed-in user | Detailed analytics |
| `/s/:slug` | Public when published | Standalone public mini-site |

The builder is registered as an available authenticated application in the
existing app registry. Protected builder routes use the shared
`ProtectedRoute` behavior and return users to their intended route after
Google sign-in.

The public route is rendered outside the standard `Layout`. Published sites
must not inherit the Arvenilo header, footer, global grid background, or
application theme. A missing, unpublished, or deleted slug displays a compact
public not-found page.

## User Experience

### Dashboard

The dashboard header shows `N of 5 sites used` and a primary `Create site`
action. Each site card shows:

- site name and public slug;
- thumbnail generated from its current theme values;
- `Draft`, `Published`, or `Changes unpublished` status;
- last edited time;
- total views and total link clicks;
- actions for edit, open public site, duplicate, and delete.

Create and duplicate controls are disabled at five sites and explain the
limit. The backend still independently enforces the limit.

Deleting a site requires typing its site name in a confirmation dialog.
Deletion removes the private draft, public snapshot, analytics, slug
reservation, and all private/public assets for that site.

### Creation

The creation route presents the following initial templates:

- **Creator** — friendly gradient, centered profile, rounded link buttons;
- **Portfolio** — editorial typography, left-aligned content, image emphasis;
- **Minimal** — neutral background, compact spacing, outlined buttons;
- **Bold** — high-contrast palette, oversized heading, solid buttons;
- **Start from scratch** — neutral defaults with a profile block and one empty
  link block.

Selecting a template opens a form for site name and desired slug. Slugs are
lowercase ASCII, 3–40 characters, begin and end with an alphanumeric
character, and may contain single hyphens between segments. Reserved
application words such as `login`, `mini-sites`, `s`, `api`, `admin`, and
`assets` are rejected.

The server creates the site only after atomically confirming both the unique
slug and the user's remaining site allowance.

### Live Studio

Desktop uses the approved three-part Live Studio:

1. a left navigation rail for Content, Design, Settings, and Analytics;
2. a focused center editor for the selected section or block;
3. a sticky phone-sized live preview.

At widths below 900px, the navigation becomes a horizontal section switcher
and the editor exposes `Edit` and `Preview` tabs. The preview renderer is the
same component used by the public page so editor and published output cannot
drift.

The header shows the site name, save state, public status, undo/redo controls,
and `Publish` or `Publish changes`. Draft changes autosave after 700 ms of
inactivity. The status cycles through `Unsaved`, `Saving`, `Saved`, and
`Couldn’t save`. A failed save keeps the local state and offers retry.
Publishing is always explicit.

### Content Blocks

Every block has a stable generated ID, type, visibility flag, and type-specific
content. The initial block types are:

- profile header: avatar, display name, short bio;
- link: label, destination URL, optional supporting text, optional icon;
- heading: text and heading level;
- paragraph: plain text with line breaks;
- image: uploaded image, alternative text, optional caption;
- social icons: ordered social network links;
- divider: line style and width;
- spacer: small, medium, or large vertical space.

Users can add, select, edit, reorder, hide/show, duplicate, and delete blocks.
Reordering supports pointer controls and explicit Move up/Move down buttons for
keyboard accessibility. A site may contain at most 25 blocks, all of which may
be link blocks.

Text is stored as plain text and never interpreted as HTML. Link destinations
accept `https:`, `http:`, `mailto:`, and `tel:` schemes. Public web links open
in a new tab with `noopener noreferrer`; mail and telephone links use the
current tab.

### Design Controls

Templates initialize the same editable theme model used by blank sites.
Changing a preset never removes content blocks. Users can then control:

- background as a solid color, two-color gradient, or uploaded image;
- primary text and muted text colors;
- button background, text, and border colors;
- display and body font from the bundled curated font choices;
- alignment: left or center;
- page width and vertical density;
- button style: solid, outline, soft, or glass;
- button corner radius and shadow strength;
- profile image shape and size.

The editor validates readable color values and warns when text/button contrast
falls below WCAG AA. A warning does not block saving, but publishing requires
the primary page text and link-button text to meet AA contrast.

### Settings and Publishing

Settings include internal site name, public slug, page title, meta
description, social preview image, and destructive actions. Updating a slug
uses a server transaction: reserve the new slug, update the draft, update or
remove the public snapshot, then release the old slug.

Publishing validates the full draft, promotes referenced assets, and replaces
the public snapshot atomically from the visitor's perspective. The snapshot
contains only public rendering data and public asset URLs. It does not expose
the owner's email, Firebase UID, draft metadata, or analytics.

Unpublishing immediately removes the public snapshot but retains the slug
reservation and private draft. Republishing restores the same public URL.

## Component Boundaries

- `MiniSitesDashboardPage` owns the dashboard query and dashboard-level
  actions.
- `NewMiniSitePage` owns template selection and initial site creation.
- `MiniSiteStudioPage` coordinates draft loading, autosave state, section
  selection, and publish actions.
- `ContentPanel`, `DesignPanel`, `SettingsPanel`, and `AnalyticsPanel` expose
  one focused editor concern each.
- `BlockList` owns ordered selection and reordering controls.
- Type-specific block editors own field validation for a single block type.
- `MiniSiteRenderer` renders a validated published or draft site model and is
  shared by live preview and public pages.
- `PublicMiniSitePage` loads only a published snapshot by slug and reports
  analytics without importing editing code.
- `miniSiteRepository` is the only browser module that calls Firestore,
  Storage, or callable Functions.
- Pure modules define templates, model normalization, slug rules, URL rules,
  theme-to-CSS conversion, contrast calculation, and publish validation.

Files should remain grouped under `src/apps/mini-site-builder/`, with
subdirectories only where a boundary has multiple implementation files and
tests. Firebase Functions live in `functions/src/`, and rule tests live in
`firebase-tests/`.

## Data Model

### Private draft

`users/{uid}/sites/{siteId}`

```json
{
  "name": "Maya Studio",
  "slug": "maya-studio",
  "status": "published",
  "templateId": "creator",
  "blocks": [],
  "theme": {},
  "seo": {
    "title": "Maya Studio",
    "description": "",
    "socialImagePath": null
  },
  "publishedRevision": 4,
  "draftRevision": 5,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp",
  "publishedAt": "server timestamp"
}
```

`status` is `draft` or `published`. `draftRevision` increments on every
accepted save. When the two revisions differ, the dashboard and editor show
`Changes unpublished`.

### User quota

`users/{uid}/private/account`

```json
{
  "siteCount": 3
}
```

Only Admin SDK functions write `siteCount`. Site creation, duplication, and
deletion update it inside a transaction with the affected draft and slug
reservation.

### Slug reservation

`miniSiteSlugs/{slug}`

```json
{
  "siteId": "generated id",
  "ownerId": "firebase uid",
  "createdAt": "server timestamp"
}
```

Clients cannot read or write this collection. Functions use document
existence to guarantee global uniqueness.

### Published snapshot

`publishedMiniSites/{slug}`

```json
{
  "schemaVersion": 1,
  "siteId": "generated id",
  "slug": "maya-studio",
  "blocks": [],
  "theme": {},
  "seo": {},
  "revision": 4,
  "publishedAt": "server timestamp"
}
```

Anyone may read one published snapshot by exact slug. Only Admin SDK functions
write or delete snapshots. Listing the collection is denied.

### Analytics

`users/{uid}/sites/{siteId}/analytics/summary`

```json
{
  "totalViews": 120,
  "totalClicks": 38,
  "linkClicks": {
    "stable-block-id": 22
  },
  "updatedAt": "server timestamp"
}
```

`users/{uid}/sites/{siteId}/analyticsDays/{YYYY-MM-DD}` stores daily views,
total clicks, and per-link counts. Only the owner may read analytics. Only
Admin SDK functions write analytics.

For first-release scale, analytics functions use atomic increments. The
storage boundary allows replacing these with sharded counters later without
changing the UI contract.

## Firebase Functions

Callable Cloud Functions provide:

- `createMiniSite({ name, slug, templateId })`;
- `duplicateMiniSite({ sourceSiteId, name, slug })`;
- `changeMiniSiteSlug({ siteId, slug })`;
- `publishMiniSite({ siteId })`;
- `unpublishMiniSite({ siteId })`;
- `deleteMiniSite({ siteId, confirmationName })`;
- `recordMiniSiteEvent({ slug, type, blockId?, eventId })`.

All management functions require a valid Firebase Authentication token and
verify ownership. The event function allows an unauthenticated caller but
requires App Check in production, verifies that the slug is currently
published, accepts only `view` or `link_click`, and verifies that a clicked
block ID is a visible link in the published snapshot.

Each visitor session generates an opaque random `eventId`. The event endpoint
stores a short-lived deduplication record keyed by the event ID so refreshes,
React strict-mode effects, retries, and double-clicks do not multiply counts.
This is useful product analytics, not fraud-proof measurement; App Check and
deduplication reduce casual abuse but cannot prove that every event came from
a human.

## Storage Model

- `mini-site-drafts/{uid}/{siteId}/{assetId}` — authenticated owner read/write;
- `mini-site-public/{siteId}/{revision}/{assetId}` — public read, no client
  writes.

Uploads accept JPEG, PNG, WebP, or GIF images up to 5 MiB. The browser validates
type and size before upload; Storage Rules repeat those checks. Publishing
copies only referenced assets to the revisioned public prefix and writes those
public URLs into the snapshot. Old public revisions are deleted after a
successful publish.

## Security Rules

Firestore rules will:

- allow an authenticated user to get/list only site documents beneath their
  own UID;
- allow an owner to update draft content fields while preventing client writes
  to quota, analytics, publish-revision, and server timestamp fields;
- deny all client creation and deletion of sites because those operations go
  through functions;
- allow exact reads of published snapshots and deny client writes;
- deny all access to slug reservations;
- allow only owners to read analytics and deny all client analytics writes;
- deny unmatched paths.

Storage rules will:

- allow an authenticated owner to read/write only their draft prefix;
- validate file type and size on draft writes;
- allow public reads from the public prefix;
- deny all client writes to the public prefix;
- deny unmatched paths.

Rules are tested with the Firebase Emulator Suite for owner, other-user,
signed-out, malformed-data, quota-field, analytics, and public-read cases.

## State, Validation, and Error Handling

The editor holds an immutable normalized draft model in React state. Every
change passes through pure reducers so undo and redo are deterministic.
Autosave submits the latest revision and ignores stale responses. A route
transition with unsaved local changes shows a confirmation prompt.

Expected failures receive specific messages:

- unavailable slug;
- five-site limit reached;
- signed-out or expired session;
- permission denied;
- invalid content or inaccessible contrast;
- unsupported or oversized upload;
- offline/network failure;
- draft changed in another session;
- publish or analytics service unavailable.

Loading states use skeletons for dashboard cards and a contained status panel
for the editor/public page. Error states retain navigation and include a retry
action. Public analytics failures never block navigation or rendering.

## Accessibility and Responsive Behavior

- Every form field has a programmatic label and inline error association.
- Builder controls are keyboard reachable and use visible focus treatment.
- Reordering has keyboard buttons in addition to pointer drag behavior.
- Dialogs trap focus and return it to the invoking control.
- The preview frame has a descriptive title.
- Public sites preserve semantic heading order based on validated blocks.
- Images require alternative text unless explicitly marked decorative.
- Motion respects `prefers-reduced-motion`.
- The builder works from 320 px wide; public pages work from 280 px wide.
- Publishing blocks primary text and link-button combinations below WCAG AA
  contrast.

## Testing Strategy

### Pure unit tests

- slug normalization, reserved names, and validation;
- site/block limits and model normalization;
- URL scheme validation;
- template cloning without shared mutable objects;
- theme CSS variable generation and contrast checks;
- publish validation and public snapshot sanitization;
- analytics event validation and deduplication keys.

### React component and route tests

- protected dashboard/new/editor/analytics routes;
- public route outside the standard application layout;
- dashboard empty, populated, limit, loading, and error states;
- template and blank-site creation;
- add/edit/reorder/hide/duplicate/delete block behavior;
- autosave status transitions and retry;
- publish validation and state;
- mobile Edit/Preview tabs;
- analytics loading and chart/table fallback;
- public link click reporting that never delays navigation.

### Firebase emulator tests

- authenticated owner access;
- signed-out and cross-user denial;
- public published reads and private draft denial;
- site creation and deletion quota transactions;
- slug reservation and slug changes under concurrent requests;
- publish/unpublish snapshot behavior;
- Storage type, size, owner, and public-prefix rules;
- view/click validation, deduplication, and owner-only analytics reads.

### Release verification

- run the complete Vitest suite;
- run ESLint;
- build the production bundle;
- run Firebase emulator rule/function tests;
- exercise create, customize, publish, visit, click, analyze, unpublish, and
  delete flows in a browser at desktop and mobile widths.

## Deployment and Configuration

The frontend remains deployable through the repository's existing GitHub
Pages workflow. The Firebase project must enable:

- Google Authentication;
- Cloud Firestore;
- Cloud Storage;
- App Check for web using reCAPTCHA Enterprise;
- second-generation callable Cloud Functions;
- Blaze billing for function deployment.

The frontend adds Firebase Storage, Functions, and App Check initialization to
the existing client configuration. No service-account credentials or private
server keys are added to the browser bundle or repository.
