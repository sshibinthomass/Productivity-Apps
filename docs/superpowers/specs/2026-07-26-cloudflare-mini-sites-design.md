# Cloudflare Mini-Sites and Email Authentication Design

## Summary

The Productivity Apps frontend will remain hosted by GitHub Pages while its
authentication and mini-site backend move completely off Firebase.

The production frontend will use the custom GitHub Pages domain
`app.shibinthomas.com`. Cloudflare Workers will expose the authenticated API at
`api.shibinthomas.com` and public mini-sites at
`links.shibinthomas.com/{slug}`. Cloudflare D1 will store accounts, sessions,
site content, and analytics. Cloudflare R2 will store uploaded images. Better
Auth will provide email-and-password authentication inside the Worker, and
Resend will send verification and password-reset messages from
`no-reply@shibinthomas.com`.

Users must sign in to create and manage mini-sites. Published mini-sites remain
publicly viewable without an account. A database-level rule and API validation
will limit every account to five mini-sites.

## Goals

- Remove Firebase Authentication, Firestore, Cloud Functions, Cloud Storage,
  and all browser Firebase SDK usage.
- Replace Google-only sign-in with email-and-password registration and login.
- Require email verification before allowing account management actions.
- Provide secure password-reset and password-change flows.
- Preserve the existing mini-site dashboard, templates, blank-canvas option,
  studio, publishing flow, public rendering, uploads, and analytics.
- Enforce ownership and a maximum of five sites per account on the server.
- Keep published mini-sites publicly viewable at stable, readable URLs.
- Keep the frontend deployed through the existing GitHub Pages workflow.
- Use Cloudflare's free tiers where practical and avoid requiring Firebase
  Blaze.

## Non-Goals

The migration will not add:

- social login providers;
- user billing or subscriptions;
- team accounts or shared editing;
- custom domains for individual users' mini-sites;
- automatic import of Firebase Authentication identities;
- a general-purpose email marketing system;
- arbitrary HTML, JavaScript, or third-party embed execution.

Existing Google-only users will create a new email-and-password account.
Firebase passwords cannot be migrated because the current application does not
have them and authentication providers do not expose password material.

## Production Domains

| Domain | Provider | Purpose |
| --- | --- | --- |
| `app.shibinthomas.com` | GitHub Pages | Productivity Apps dashboard, login, and mini-site editor |
| `api.shibinthomas.com` | Cloudflare Worker | Authentication and authenticated/public JSON API |
| `links.shibinthomas.com/{slug}` | Cloudflare Worker | Public mini-site HTML and assets |
| `no-reply@shibinthomas.com` | Resend | Verification and password-reset sender |

Using `app.shibinthomas.com` as the GitHub Pages custom domain keeps the
frontend and API under the same registrable domain. The browser can therefore
use secure, HTTP-only session cookies without relying on third-party cookies or
placing long-lived bearer tokens in local storage.

The existing `sshibinthomass.github.io` project URL may redirect to the custom
domain after GitHub Pages is configured. It is not used as the email-sending
domain because GitHub owns `github.io`.

## User Experience

### Registration

The login page gains separate sign-in and create-account modes. Registration
requires:

- email address;
- password;
- password confirmation;
- successful Cloudflare Turnstile challenge;
- acceptance of the application's terms and privacy notice.

After registration, the application displays a verification-pending screen and
sends a single-use verification link. The link returns to
`app.shibinthomas.com`, verifies the address through the API, and then opens the
signed-in dashboard.

Verification messages can be resent with a cooldown. The response is
deliberately generic so it does not reveal whether an address is registered.

### Sign-In and Sign-Out

A verified user signs in with email and password. The API establishes a
rotatable, secure, HTTP-only session cookie. The frontend fetches the current
session during startup and exposes the same high-level user/loading/error
contract currently consumed by protected routes and account controls.

Signing out invalidates the server-side session and clears the cookie.
Authentication errors remain intentionally generic where a detailed response
could enable account enumeration.

### Password Recovery

The forgot-password form always returns the same acknowledgement. For a known
verified account, Resend sends a short-lived, single-use reset link. The reset
page accepts and confirms a new password, revokes all existing sessions for
that account, and returns the user to sign-in.

A signed-in user may change their password after confirming the current
password. A successful password change also revokes other sessions.

### Mini-Sites

The existing mini-site experience remains:

- template selection or start from scratch;
- at most five independent sites per user;
- draft autosave and optimistic concurrency;
- explicit publish and unpublish actions;
- unique public slugs;
- public rendering without login;
- private analytics for the owner.

Public URLs change from the GitHub Pages application route to
`https://links.shibinthomas.com/{slug}`. Old `/s/{slug}` application routes will
redirect to the new hostname when possible.

## Architecture

### Frontend

The React/Vite application remains a static GitHub Pages deployment. Firebase
client initialization is replaced with:

- a small API client configured by `VITE_API_BASE_URL`;
- a Better Auth-compatible browser client;
- an authentication context exposing email/password operations;
- a mini-site repository that calls REST endpoints instead of Firebase SDKs;
- direct-to-API upload requests for files up to the existing 5 MiB limit.

All API requests use `credentials: "include"`. The API responds only to the
explicit production origin, the explicitly configured local development
origin, and test origins. It never uses a wildcard origin with credentials.

### Cloudflare Worker

One Worker deployment owns both `api.shibinthomas.com` and
`links.shibinthomas.com`, branching by hostname:

- the API hostname serves Better Auth and JSON endpoints;
- the links hostname serves public mini-site HTML, cached public data, and R2
  assets.

Keeping both concerns in one Worker avoids duplicated validation and model
code. Route modules remain separate so public requests never inherit
authenticated management behavior.

The Worker receives bindings for:

- D1 database `productivity-apps`;
- R2 bucket `productivity-apps-assets`;
- Turnstile secret;
- Better Auth secret;
- Resend API key;
- allowed frontend origins and canonical domain settings.

Secrets are added with Wrangler's secret store and are never committed,
rendered into the Vite bundle, or logged.

### Better Auth

Better Auth runs inside the Worker with its D1 adapter and email/password
support. Its managed tables store users, credentials, sessions, accounts, and
verification tokens. Passwords use Better Auth's supported strong password
hashing and are never stored or logged in plaintext.

Configuration will:

- require verified email for normal sign-in;
- use secure, HTTP-only cookies in production;
- trust only the configured application origin;
- use short-lived, single-use verification and reset tokens;
- revoke sessions after password reset;
- send email asynchronously through Resend after token creation;
- normalize emails for comparison without altering the address used for mail.

Turnstile verification and request throttling protect registration, sign-in,
resend, password-reset, and public analytics endpoints.

### Resend

Resend sends transactional messages after `shibinthomas.com` is verified with
the required DNS records. Messages use:

- sender: `Arvenilo <no-reply@shibinthomas.com>`;
- verification links on `app.shibinthomas.com`;
- password-reset links on `app.shibinthomas.com`;
- plain-text and minimal accessible HTML bodies;
- no marketing tracking or promotional content.

If email delivery is temporarily unavailable, account creation remains stored
and the user can request another verification message later. Email failures do
not expose secret tokens in API responses or logs.

## D1 Data Model

Better Auth owns its generated authentication tables. Application migrations
add the following tables.

### `mini_sites`

| Column | Purpose |
| --- | --- |
| `id` | Opaque site identifier |
| `owner_id` | Better Auth user ID |
| `name` | Private site name |
| `slug` | Globally unique public slug |
| `status` | `draft` or `published` |
| `template_id` | Initial template identifier |
| `draft_json` | Validated current editor model |
| `draft_revision` | Optimistic concurrency counter |
| `published_revision` | Last published revision |
| `created_at` | UTC creation timestamp |
| `updated_at` | UTC modification timestamp |
| `published_at` | Nullable UTC publication timestamp |

Indexes cover `owner_id`, unique `slug`, and owner dashboards ordered by
`updated_at`.

A `BEFORE INSERT` database trigger rejects a sixth `mini_sites` row for the
same owner. The Worker checks the count first to return a friendly message, but
the trigger is the authoritative race-safe limit.

### `published_sites`

| Column | Purpose |
| --- | --- |
| `slug` | Primary public lookup key |
| `site_id` | Unique source site ID |
| `snapshot_json` | Sanitized public rendering model |
| `title` | Page title for server-produced metadata |
| `description` | Public meta description |
| `social_image_url` | Nullable social image |
| `revision` | Published source revision |
| `published_at` | UTC publication timestamp |

Publishing replaces the snapshot using a D1 batch so visitors see either the
previous complete revision or the next complete revision.

### `site_assets`

Tracks R2 object keys, ownership, media type, size, publication status, and
creation time. Only the owning user can reach draft objects. Public objects are
served through the links hostname after publication.

### `analytics_summary` and `analytics_days`

Store total and per-day view/click counts. Analytics reads require site
ownership. Public event writes accept only validated published slugs and
visible link block IDs.

### `analytics_events`

Stores a short-lived unique event ID for deduplication. Cleanup removes expired
rows on a scheduled Worker trigger. Analytics remain useful product metrics,
not a claim of fraud-proof measurement.

## API Contract

### Authentication

- `ALL /auth/*` - Better Auth handler
- `GET /v1/session` - normalized current-user response

### Authenticated site management

- `GET /v1/sites`
- `POST /v1/sites`
- `GET /v1/sites/{siteId}`
- `PUT /v1/sites/{siteId}`
- `POST /v1/sites/{siteId}/duplicate`
- `PUT /v1/sites/{siteId}/slug`
- `POST /v1/sites/{siteId}/publish`
- `POST /v1/sites/{siteId}/unpublish`
- `DELETE /v1/sites/{siteId}`
- `GET /v1/sites/{siteId}/analytics`
- `POST /v1/sites/{siteId}/assets`

Every management endpoint requires a valid Better Auth session, verifies
`owner_id`, validates request size and schema, and returns a consistent error
shape:

```json
{
  "error": {
    "code": "site_limit",
    "message": "You can create up to five mini-sites."
  }
}
```

Draft updates include the expected revision. A stale revision returns HTTP 409
without overwriting the newer draft.

### Public endpoints

- `GET https://links.shibinthomas.com/{slug}` - public HTML shell with title,
  description, and social metadata from the published snapshot
- `GET /v1/public/sites/{slug}` - sanitized published model
- `POST /v1/public/sites/{slug}/events` - validated deduplicated view or click
- `GET https://links.shibinthomas.com/assets/{key}` - published R2 object

Missing, unpublished, and deleted slugs return the same public 404 response.
Draft JSON, owner IDs, emails, sessions, and analytics are never included in a
public response.

## R2 Storage

Object keys use separate private and published prefixes:

- `drafts/{ownerId}/{siteId}/{assetId}`;
- `public/{siteId}/{revision}/{assetId}`.

The upload endpoint accepts JPEG, PNG, WebP, or GIF images up to 5 MiB and
validates both declared media type and file signature. Object keys are
generated by the server rather than accepted from the browser.

Publishing copies only referenced assets to an immutable revision prefix and
writes those public URLs into the published snapshot. Unpublishing removes
public database access immediately. A scheduled cleanup deletes unreferenced
drafts and obsolete publication revisions after a grace period.

The R2 bucket itself is not globally public. The Worker serves approved public
objects, applies cache headers, and prevents enumeration.

## Security and Privacy

- Better Auth owns password hashing, verification tokens, and session
  lifecycle.
- Production cookies are `Secure`, `HttpOnly`, and use an appropriate
  same-site policy for the sibling application/API subdomains.
- CORS uses exact allowlisted origins and permits credentials only for those
  origins.
- State-changing requests receive Better Auth origin/CSRF protection in
  addition to session validation.
- Turnstile is verified server-side; client success alone is never trusted.
- Login and email endpoints have per-address and per-network throttles with
  bounded retention.
- Every private query includes and verifies the authenticated owner ID.
- The five-site limit is enforced by both API validation and a D1 trigger.
- Slugs are normalized, reserved-word checked, and protected by a unique
  database index.
- Text remains plain text. URLs and uploaded media are revalidated by the
  Worker before storage or publication.
- API logs omit passwords, cookies, authentication tokens, reset tokens, raw
  request bodies, and full email addresses.
- Public analytics do not store visitor email addresses or raw IP addresses.
- Resend and Cloudflare credentials live only in Worker secrets.

## Error Handling

The frontend maps stable API error codes to existing user-facing states:

- invalid or unverified credentials;
- verification message cooldown;
- expired verification or reset link;
- unavailable slug;
- five-site limit reached;
- stale draft revision;
- unsupported or oversized upload;
- signed-out or expired session;
- network, email, storage, or database failure.

Public rendering does not fail when analytics recording fails. Link navigation
continues immediately, and analytics requests use a short timeout.

## Migration and Rollout

1. Add the Worker project, Better Auth setup, D1 migrations, R2 bindings, and
   local development configuration.
2. Add contract and integration tests for authentication, ownership, quota,
   publishing, uploads, and public access.
3. Replace the frontend Firebase authentication client with email/password
   flows while preserving the `AuthContext` consumer contract where useful.
4. Replace `miniSiteRepository` Firebase operations with the Worker API.
5. Configure and verify `shibinthomas.com` in Cloudflare and Resend.
6. Configure:
   - `app.shibinthomas.com` as the GitHub Pages custom domain;
   - `api.shibinthomas.com` as the Worker API custom domain;
   - `links.shibinthomas.com` as the Worker public-site custom domain.
7. Deploy D1 migrations, Worker secrets, the Worker, and the updated GitHub
   Pages bundle.
8. Verify registration, email verification, login, recovery, site creation,
   five-site enforcement, upload, publish, public view, analytics, unpublish,
   and deletion in production.
9. Remove Firebase dependencies, Functions, rules, indexes, configuration, and
   deployment scripts after the Cloudflare flow passes production smoke tests.

No automatic Firebase data migration is required for the current failed
creation flow. Before Firebase resources are removed, a read-only inventory
will confirm whether any site documents or uploaded assets exist. If data is
found, export and import become a separate reviewed migration step.

## Testing Strategy

### Unit tests

- email and request validation;
- origin and CORS handling;
- slug normalization and reserved words;
- public snapshot sanitization;
- API error mapping;
- asset type/signature validation;
- analytics event validation;
- frontend auth and repository adapters.

### Worker integration tests

- registration, verification, session, sign-out, and password reset;
- invalid, expired, and reused tokens;
- account-enumeration-resistant responses;
- signed-out and cross-user denial;
- five-site trigger under competing create requests;
- slug uniqueness under competing requests;
- optimistic draft conflicts;
- publish/unpublish atomic visibility;
- private versus public R2 access;
- event validation and deduplication.

Tests use an isolated local D1 database, local R2-compatible bindings, and a
fake email transport. Automated tests never send real email.

### Frontend and browser tests

- registration and sign-in form states;
- protected-route return behavior;
- session restoration and expiration;
- dashboard, creation, editor, and analytics flows;
- public mini-site rendering without a session;
- desktop and mobile behavior;
- GitHub Pages custom-domain routing;
- links and API hostname integration with credentialed CORS.

### Release verification

- run all Vitest suites and Worker integration tests;
- run ESLint;
- build the production Vite bundle;
- run D1 migrations against a preview database;
- deploy a preview Worker and perform browser smoke tests;
- verify DNS, TLS, cookie, CORS, and email authentication records;
- perform the full production journey on desktop and mobile.

## Operational Limits and Cost Controls

- D1 and R2 usage remain within configured Cloudflare free-tier limits until
  traffic requires an explicit plan review.
- Upload size stays capped at 5 MiB and sites stay capped at five per account.
- Analytics retention and deduplication cleanup prevent unbounded event-row
  growth.
- Resend's free-tier daily and monthly limits are monitored. Email failures
  produce retryable UI states rather than silently creating unusable accounts.
- No paid Cloudflare Email Sending dependency is required for the first
  release.

## Completion Criteria

The migration is complete when:

- a new user can register with email and password, verify their email, sign in,
  sign out, and reset their password;
- an authenticated user can create and manage up to five sites and cannot
  create a sixth through either the UI or direct API calls;
- a published site is available without login at
  `links.shibinthomas.com/{slug}`;
- drafts, ownership data, and analytics are inaccessible to other users and
  signed-out visitors;
- image uploads and published assets use R2;
- the frontend contains no active Firebase runtime dependency or configuration;
- production smoke tests pass on the configured domains.
