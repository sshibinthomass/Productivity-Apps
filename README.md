# Arvenilo Network

Arvenilo Network is a directory of focused React productivity applications built
with the Precision Spatial design system. The Mini-Site Builder lets signed-in
users create up to five public profile and link pages from a template or a blank
canvas, manage modular blocks, publish to a unique slug, and review private
analytics. Published sites are publicly readable at `https://links.shibinthomas.com/<slug>`.

Mini-site accounts use email and password authentication. Creating, editing,
publishing, deleting, uploading media, and viewing analytics require a signed-in
account; public visitors can view published sites without an account.

## Local development

Node.js 22.12 or newer is required.

```bash
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run build
npm run dev:worker
```

In a second terminal, run the frontend:

```bash
npm run dev
```

Configure `.env.local` only with public browser values:

```dotenv
VITE_API_BASE_URL=http://localhost:8787
VITE_PUBLIC_SITE_BASE_URL=http://localhost:8787
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

Configure Worker-only values in an untracked `.dev.vars` file (starting from
`.dev.vars.example`). `BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`, and
`RESEND_API_KEY` must never be committed.

The migration and build steps are required before starting the Worker: D1 must
have its schema and the Worker serves the `dist` assets configured in
`wrangler.jsonc`. This sequence works from a clean checkout with no `dist`
directory.

Local routes include:

- Frontend: `http://localhost:5173/`
- Mini-Site dashboard: `http://localhost:5173/mini-sites`
- Public mini-site: `http://localhost:8787/s/<slug>`

Quality checks:

```bash
npm run check:no-firebase
npm run test:run
npm run lint
npm run build
```

## Project structure

```text
src/       React applications, shared UI, and browser API clients
worker/    Cloudflare Worker, D1 migrations, R2 media access, and API tests
scripts/   Local build and migration guards
```

The frontend uses the Cloudflare Worker API; browser route protection is a UX
layer only. The Worker independently enforces account ownership, the five-site
limit, publishing, analytics, and media access.

## Deployment

The complete release, DNS, secret-management, recovery, privacy, and smoke-test
procedure is in [the Cloudflare production runbook](docs/cloudflare-deployment.md).

### Cloudflare production prerequisites

Before the first production deployment for each Cloudflare account/environment,
create the D1 database. This is required once per account/environment:

```bash
npx wrangler d1 create productivity-apps
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing
`REPLACE_WITH_D1_DATABASE_ID` in the `DB` binding. Then apply the remote schema
and deploy the Worker:

```bash
npm run db:migrate:remote
npm run deploy:worker
```

CI assumes the D1 database already exists and has its configured `database_id`;
it applies migrations and deploys the Worker but does not create production
infrastructure.

GitHub Pages deploys the frontend after tests, lint, and build. Its production
build receives these GitHub Actions variables:

```text
VITE_API_BASE_URL=https://api.shibinthomas.com
VITE_PUBLIC_SITE_BASE_URL=https://links.shibinthomas.com
VITE_TURNSTILE_SITE_KEY=<GitHub Actions variable>
```

The Cloudflare Worker deployment workflow runs when Worker, frontend, package,
or Vite configuration changes on `main`. It runs the same checks, applies the
D1 migrations, then deploys the Worker. Configure these GitHub repository
secrets for that workflow:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Production authentication, Turnstile, and email-delivery values remain Worker
secrets configured through Wrangler; do not add them to GitHub Actions or the
repository.
