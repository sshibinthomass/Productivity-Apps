# Arvenilo Network

Arvenilo Network is a directory of focused React productivity applications
built with the Precision Spatial design system.

## Application network

- **Mini-Site Builder** — `AVAILABLE NOW` — signed-in users can create up to
  five public profile/link pages from a template or a blank canvas, customize
  modular blocks, publish to a unique slug, and review private analytics.
- **QR Generator** — `AVAILABLE NOW` — create styled, scan-aware QR codes for
  links, contacts, Wi-Fi, events, profiles, payments, and custom payloads.
- **Multi Link Opener** — `AVAILABLE NOW` — validate and open up to 100 links
  immediately or at a selected whole-second interval.
- **JSON Formatter** — `AVAILABLE NOW`
- **Text Comparison** — `AVAILABLE NOW`
- **Text Formatter**, **Focus Timer**, and **Quick Notes** — `COMING SOON`

The home page and public tools remain available without an account. Mini-site
creation, editing, publishing, deletion, and analytics require Google sign-in.
Published mini-sites are publicly readable at `/s/<slug>`.

## Local development

Node.js 22.12 or newer is required.

```bash
npm install
npm --prefix functions install
npm run dev
```

Create an untracked `.env.local` from `.env.example`:

```dotenv
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_APP_CHECK_SITE_KEY=your-recaptcha-enterprise-site-key
VITE_FIREBASE_FUNCTIONS_REGION=europe-west1
VITE_FIREBASE_USE_EMULATORS=false
VITE_FIREBASE_EMULATOR_AUTO_LOGIN=false
```

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is optional during initial local setup. If
App Check enforcement is enabled, register a web debug token in the Firebase
Console and add it only to `.env.local`:

```dotenv
VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN=your-registered-debug-token
```

Never commit an App Check debug token, service-account file, Admin SDK key,
OAuth client secret, or other private credential. Firebase Web configuration
values are public project identifiers.

Local routes include:

- Home: `http://localhost:5173/`
- QR Generator: `http://localhost:5173/qr-generator`
- Multi Link Opener: `http://localhost:5173/multi-link-opener`
- Mini-Site dashboard: `http://localhost:5173/mini-sites`
- Public mini-site: `http://localhost:5173/s/<slug>`

Quality checks:

```bash
npm run test:run
npm run test:firebase
npm run lint
npm run build
```

## Project structure

```text
src/
├── apps/
│   ├── mini-site-builder/
│   ├── multi-link-opener/
│   └── qr-generator/
├── auth/
├── components/
├── config/
├── pages/
└── styles/

functions/
├── package.json
└── src/
```

Every productivity tool owns a folder under `src/apps/`. Shared navigation,
layout, authentication, and registry cards remain in their top-level folders.
The registry controls application routing and whether a tool requires auth.
Client-side route protection is not a backend authorization boundary; Firebase
Rules and callable Functions independently enforce mini-site ownership.

## Firebase setup

Use one Firebase project for the complete Arvenilo Network suite:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
   and register a Web app.
2. Under **Authentication → Sign-in method**, enable Google and select a
   support email.
3. Under **Authentication → Settings → Authorized domains**, keep `localhost`
   for development and add the production GitHub Pages hostname.
4. Create a **Cloud Firestore** database. The included rules keep drafts and
   analytics owner-only and permit exact reads of published snapshots.
5. Enable **Cloud Storage** and copy its bucket name into
   `VITE_FIREBASE_STORAGE_BUCKET`.
6. Enable **reCAPTCHA Enterprise**, create a website key for the local and
   production domains, register the Web app under **App Check**, and copy the
   site key into `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
7. Select the Blaze plan before deploying second-generation Cloud Functions.
   The callable API uses `europe-west1` unless the environment overrides it.
8. Copy the Web app configuration into `.env.local`.

### Firebase emulators

The local suite includes Authentication, Firestore, Storage, Functions, and
the Emulator UI:

```bash
npm run emulators
```

To point the Vite app at that local suite, set
`VITE_FIREBASE_USE_EMULATORS=true` in `.env.local` and use the demo project
configuration. For automated local UI testing, also set
`VITE_FIREBASE_EMULATOR_AUTO_LOGIN=true` to use an anonymous emulator-only
account. Both switches are honored only by development builds.

Authorization tests start the required emulators automatically:

```bash
npm run test:firebase
```

Java 11 or newer must be available on `PATH`. On Windows with Android Studio,
its bundled JBR can be used by setting `JAVA_HOME` for the terminal session.
The emulator project ID is `demo-mini-sites`; it never writes to production.

### Firebase deployment

Select the intended Firebase project, then deploy the backend and security
boundaries:

```bash
firebase use <project-id>
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

Keep App Check enforcement enabled on the callable Functions. Add the
production hostname to Firebase Authentication, reCAPTCHA Enterprise, and
App Check before deploying the web build.

## GitHub Pages

Production routes are:

- QR Generator:
  `https://<username>.github.io/Productivity-Apps/qr-generator`
- Home: `https://<username>.github.io/Productivity-Apps`
- Mini-Site dashboard:
  `https://<username>.github.io/Productivity-Apps/mini-sites`
- Public mini-site:
  `https://<username>.github.io/Productivity-Apps/s/<slug>`

Vite uses `/Productivity-Apps/` as its production base. The static `404.html`
redirect restores direct visits and refreshes on nested SPA routes.

To deploy:

1. Push the repository's `main` branch to GitHub.
2. Under **Settings → Pages**, choose **GitHub Actions** as the source.
3. Under **Settings → Secrets and variables → Actions → Variables**, add
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_CHECK_SITE_KEY`, and
   `VITE_FIREBASE_FUNCTIONS_REGION`.

Each push to `main` runs the project checks, builds `dist`, and deploys it
through the official GitHub Pages actions.
