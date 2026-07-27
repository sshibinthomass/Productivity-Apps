# Cloudflare production runbook

This runbook deploys the Mini-Site Builder without Firebase. It applies to the
Cloudflare zone for `shibinthomas.com`, the GitHub Pages frontend, the
`productivity-apps` Worker, D1, R2, Turnstile, and Resend. Published sites are
public; account, editor, upload, analytics, and administrative routes require a
signed-in email-and-password account.

Do not put secret values in this repository, GitHub variables, issue comments,
screenshots, or shell history. The three Worker secret *names* are
`BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`, and `RESEND_API_KEY`.

## Architecture and ownership

| Hostname | Service | Purpose |
| --- | --- | --- |
| `app.shibinthomas.com` | GitHub Pages | React dashboard, account screens, and editor |
| `api.shibinthomas.com` | Cloudflare Worker | Better Auth and `/v1/*` API |
| `links.shibinthomas.com` | Cloudflare Worker | Public pages at `/<slug>`, public assets, and public analytics events |

`api` and `links` are DNS hostnames, not `/api` and `/links` path prefixes on
the apex domain. The Worker rejects other hostnames. Its custom domains are
declared in `wrangler.jsonc`; let Wrangler attach those routes after the zone is
active instead of creating competing manual Worker routes.

The Worker uses the `DB` D1 binding, the `MEDIA` R2 binding, and `ASSETS` for
the built frontend. `APP_ORIGIN`, `API_ORIGIN`, `PUBLIC_SITE_ORIGIN`, and
`EMAIL_FROM` are non-secret `wrangler.jsonc` variables. The currently checked-in
production values are the three hosts above and `Arvenilo <no-reply@shibinthomas.com>`.

## First production setup

Perform these steps from a clean checkout on `main`. They are destructive only
where explicitly called out; do not delete Firebase yet.

1. Move or confirm the `shibinthomas.com` DNS zone is managed by Cloudflare.
   Preserve existing unrelated DNS records. Confirm that Cloudflare is the
   authoritative DNS provider before adding the hosts below.
2. Create the production D1 database once per Cloudflare account/environment.
   This command returns the ID that must replace the placeholder in
   `wrangler.jsonc` before deployment:

   ```powershell
   npx wrangler login
   npx wrangler d1 create productivity-apps
   ```

   Replace **only** `REPLACE_WITH_D1_DATABASE_ID` in the `DB` binding with the
   returned ID and commit that non-secret infrastructure identifier. Do not
   change the database name used by the migration scripts.
3. Create the non-public R2 bucket and bind it to `MEDIA`. The design uses the
   bucket name `productivity-apps-assets`:

   ```powershell
   npx wrangler r2 bucket create productivity-apps-assets
   ```

   Set the existing `r2_buckets` entry in `wrangler.jsonc` to include
   `"bucket_name": "productivity-apps-assets"` while retaining the binding name
   `MEDIA`, then commit that non-secret configuration. Do **not** enable a
   public bucket domain: the Worker authorizes and serves approved media.
4. In Resend, add and verify `shibinthomas.com` using the exact SPF and DKIM
   records shown by Resend. Publish them in Cloudflare DNS and wait for Resend
   verification. Confirm the verified sender can use
   `no-reply@shibinthomas.com`; its display address must match `EMAIL_FROM`.
   Do not guess, copy, or commit Resend's verification values.
5. Create a Cloudflare Turnstile widget restricted to
   `app.shibinthomas.com`. Keep its secret key in the Worker secret store and
   use only its site key in the frontend build variable. Verify that a solved
   challenge reports the `app.shibinthomas.com` hostname.
6. In GitHub Pages settings, add `app.shibinthomas.com` as the custom domain.
   For a Pages project and zone in the same Cloudflare account, confirm the
   custom domain in the Pages UI so Cloudflare can create the required CNAME.
   Otherwise, add the CNAME `app` pointing to `sshibinthomass.github.io` (do
   not append the repository name). Complete GitHub's custom-domain
   verification before enabling the domain and enforce HTTPS. Follow GitHub
   Pages' current DNS/verification UI if it requires an additional ownership
   record.
7. Do not pre-create records for the Worker custom domains. After the zone is
   active, deployment reads the `api.shibinthomas.com` and
   `links.shibinthomas.com` custom-domain entries in `wrangler.jsonc` and lets
   Wrangler attach them. Confirm both resolve after the first successful
   deploy.

## Secrets, variables, and deployment order

Worker secrets are entered interactively; none belongs in GitHub Actions:

```powershell
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

Use a high-entropy, unique Better Auth secret. The Turnstile value is the
server-side secret for the widget from the prior section, and the Resend value
is a restricted API key for the verified sending domain.

Set the following GitHub repository configuration for the workflows:

| Repository setting | Name | Value / purpose |
| --- | --- | --- |
| Actions variable | `VITE_TURNSTILE_SITE_KEY` | Public site key for the widget on `app.shibinthomas.com` |
| Actions secret | `CLOUDFLARE_API_TOKEN` | Token allowed to apply D1 migrations and deploy this Worker |
| Actions secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account containing the Worker and D1 database |

The Pages workflow sets `VITE_API_BASE_URL` to `https://api.shibinthomas.com`
and `VITE_PUBLIC_SITE_BASE_URL` to `https://links.shibinthomas.com` itself; do
not add those as secrets. GitHub actions do not receive Worker secrets.

After the database ID, R2 binding, DNS, sender verification, Turnstile widget,
and GitHub settings have been confirmed, run the release commands in this order:

```powershell
npm ci
npm run check:no-firebase
npm run test:run
npm run lint
npm run db:migrate:remote
npm run deploy:worker
```

`db:migrate:remote` must finish before `deploy:worker`; the Worker expects all
three migrations under `worker/migrations`. Push the verified `main` branch to
run both deployment workflows. The Worker workflow repeats the checks, migrates
D1, and deploys the Worker. The Pages workflow builds with the public
Turnstile site key and deploys GitHub Pages.

## Local development and staging

Local development needs Node.js 22.12 or newer. Copy `.dev.vars.example` to an
untracked `.dev.vars`, supply local test values for the Worker-only bindings,
and use `.env.local` for only the public browser values documented in the
README. Then run:

```powershell
npm install
npm run db:migrate:local
npm run build
npm run dev:worker
```

In another terminal, run `npm run dev`. The dashboard is at
`http://localhost:5173`, while the Worker and public local pages are at
`http://localhost:8787`.

Treat staging as a separate Cloudflare account or a separately named Worker
environment with its own D1 database, R2 bucket, custom hostnames, Turnstile
widget, Resend sender/key, Better Auth secret, and GitHub environment or branch
configuration. Never point staging at production D1 or R2. Add explicit
environment configuration before using Wrangler's `--env` option: the current
`wrangler.jsonc` only declares production, so `--env staging` is not a safe
shortcut yet. Apply each environment's migrations before its deployment.

## Backups, rollback, and incident recovery

Before schema changes and on a regular retention schedule, create a protected
off-account D1 export. This export contains personal data; encrypt it, restrict
access, and record its location and checksum outside the application database:

```powershell
npx wrangler d1 export productivity-apps --remote --output .\backups\productivity-apps-YYYY-MM-DD.sql
```

R2 is not publicly exposed. Configure an organization-approved, encrypted R2
backup process with retention and restore testing; do not copy user media into
an unprotected workstation or repository. Record the production bucket name,
snapshot time, and restore test outcome, but never object contents in tickets.

For an application incident, first preserve evidence and exports, then inspect
Cloudflare Worker logs/analytics, D1 errors, R2 errors, Resend delivery, and
Turnstile metrics. To identify a known-good uploaded Worker version, use:

```powershell
npx wrangler deployments list
npx wrangler deployments status
```

Deploy that selected prior version at 100% using the identifier it reports:

```powershell
npx wrangler versions deploy <VERSION_ID>@100
```

Replace `<VERSION_ID>` with the previously uploaded version ID. Do this only
when its schema is compatible with the already-applied migrations. Do not roll
back or delete D1 migrations in place. If a migration is not backwards
compatible, prepare and test a forward corrective migration plus a restore
procedure in staging before production recovery. Confirm public pages, sign-in,
and ownership protections after any rollback.

For a suspected secret leak, revoke the affected Resend/Turnstile/Cloudflare
credential at its provider, create a replacement, update the corresponding
Wrangler or GitHub secret, redeploy, invalidate affected sessions when the
Better Auth secret is rotated, and document the rotation time and impact. A
Better Auth secret rotation intentionally invalidates existing sessions and
outstanding signed material; announce that users will need to sign in again.

Monitor Worker errors and invocation limits, D1 read/write/storage usage, R2
storage and operations, Pages deployment status, Turnstile failures, Resend
bounces/delivery, scheduled cleanup execution, and domain/TLS status. Set
Cloudflare/Resend spending or quota alerts appropriate to the account plan and
investigate sustained auth or public-event rate-limit failures.

## Firebase inventory and removal gate

Before deleting any legacy Firebase resource, record read-only resource counts,
not personal data:

```powershell
firebase firestore:databases:list --project productivity-apps-fa97d
firebase functions:list --project productivity-apps-fa97d
```

Use the Firebase Console to record counts for `publishedMiniSites`,
`miniSiteSlugs`, `users/*/sites/*`, and the two mini-site Storage prefixes. If
any content exists, stop deletion and create a separately approved export/import
migration. Firebase Authentication identities cannot be automatically migrated;
existing Google-only users create a new email-and-password account.

## Privacy, deletion, and legal release checklist

- [ ] Publish current terms and privacy notice; registration records version
  `2026-07-26` in `user_consents`.
- [ ] Confirm the documented legal basis, retention period, data-subject access,
  correction, export, and deletion process for account data, sites, media,
  sessions, consent records, and analytics.
- [ ] Verify an account/site deletion request removes or anonymizes associated
  D1 and R2 data according to the approved retention policy, including backups
  on their documented expiry schedule.
- [ ] Confirm the privacy notice identifies Cloudflare, GitHub Pages, Resend,
  and any backup provider as applicable processors, plus their regions and
  transfer safeguards.
- [ ] Verify public pages never expose drafts, owner IDs, email addresses,
  sessions, or private analytics.
- [ ] Obtain legal/privacy approval before enabling production sign-ups or
  deleting legacy cloud data.

## Production smoke test

Run this checklist with two fresh test accounts after every first release and
after authentication, deployment, or schema changes:

- [ ] Register with a solved Turnstile challenge; receive and follow the
  verification email, then verify the address.
- [ ] Sign in, sign out, use forgotten-password and reset flows, and reload the
  dashboard to confirm the secure session restores correctly.
- [ ] Create one site from a template and one blank site.
- [ ] Create five sites, then verify a sixth is rejected both in the UI and by a
  direct authenticated API request.
- [ ] Create an intentional concurrent draft update and confirm the stale save
  returns a revision conflict without overwriting the newer draft.
- [ ] Upload supported media, publish, open `https://links.shibinthomas.com/<slug>`,
  click a link, confirm private analytics, unpublish, and delete the site.
- [ ] Confirm signed-out and second-account requests cannot read or alter the
  first account's drafts, uploads, analytics, or sites.
- [ ] Open a direct published URL on desktop and mobile; verify its title,
  description, social image, and canonical URL use the `links` hostname.
- [ ] Inspect browser/network behavior: HTTPS/TLS is valid; auth cookies are
  secure and HTTP-only; credentialed CORS permits only `app.shibinthomas.com`;
  SPF and DKIM are verified in Resend; and public HTML metadata is canonical.
