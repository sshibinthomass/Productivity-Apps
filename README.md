# Arvenilo Network

Arvenilo Network is a growing directory of focused React productivity
applications built with the Precision Spatial design system.

The site supports optional Google sign-in through Firebase Authentication.
Multi Link Opener and the home page remain public; future tools can opt into
the shared account session through registry metadata.

## Application network

- **QR Generator** — `AVAILABLE NOW` — create styled, scan-aware QR codes for
  links, contacts, Wi-Fi, events, profiles, payments, and custom payloads.

- **Multi Link Opener** — `AVAILABLE NOW` — paste one link per line and open every valid
  destination in a separate tab, either immediately or at a selected
  whole-second interval. The first link always loads immediately.
- **Text Formatter** — `COMING SOON`
- **Focus Timer** — `COMING SOON`
- **Quick Notes** — `COMING SOON`

The opener removes common list markers, wrappers, and invisible copy-paste
characters, reports every adjusted or invalid entry, and accepts up to 100
HTTP/HTTPS links per submission. It never guesses a misspelled domain.

## Local development

Node.js 22.12 or newer is required.

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` before testing Google sign-in:

```dotenv
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
```

Quality checks:

```bash
npm run test:run
npm run lint
npm run build
```

The development server uses:

- QR Generator: `http://localhost:5173/qr-generator`
- Home: `http://localhost:5173/`
- Multi Link Opener: `http://localhost:5173/multi-link-opener`

## Project structure

```text
src/
├── apps/
│   └── multi-link-opener/
├── components/
├── config/
│   └── appRegistry.jsx
├── pages/
└── styles/
```

Every productivity tool owns a folder under `src/apps/`. Shared navigation,
layout, and cards remain in `src/components/`.

To add another tool:

1. Create `src/apps/<app-name>/<AppName>Page.jsx`.
2. Keep its tool-specific styles, helpers, and tests in the same folder.
3. Add its title, description, category, status, icon, path, accent, and
   component to
   `src/config/appRegistry.jsx`.
4. Set `requiresAuth: false` for a public tool or `requiresAuth: true` for a
   tool that needs a signed-in Google account.

The registry supplies every home-page card. Only entries marked `available`
with a path and component receive a route; `coming-soon` entries remain
non-interactive announcements.
Only protected registry entries redirect signed-out visitors to `/login`.
Client-side route protection is not a backend authorization boundary; future
databases or APIs must independently enforce access.

## Firebase Authentication

Use one Firebase project for the complete Arvenilo Network suite:

1. Open the [Firebase Console](https://console.firebase.google.com/) and create
   a project named **Arvenilo Network**.
2. Register a Web app named **Arvenilo Network Web**.
3. Under **Authentication → Sign-in method**, enable **Google** and select the
   project owner's email as the support email.
4. Under **Authentication → Settings → Authorized domains**, confirm
   `localhost` is present for development and add
   `sshibinthomass.github.io` for GitHub Pages.
5. Copy the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` into
   `.env.local` using the variable names above.

The Firebase Web configuration is a public project identifier. Never add a
service-account file, Admin SDK key, OAuth client secret, or other private
credential to this browser application.

## GitHub Pages

Production routes are:

- QR Generator:
  `https://<username>.github.io/Productivity-Apps/qr-generator`
- Home: `https://<username>.github.io/Productivity-Apps`
- Multi Link Opener:
  `https://<username>.github.io/Productivity-Apps/multi-link-opener`

The Vite build uses `/Productivity-Apps/` as its production base. A static
`404.html` redirect restores direct visits and refreshes on nested routes
without adding a hash to the URL.

To deploy:

1. Create a GitHub repository named `Productivity-Apps`.
2. Push this project to the repository's `main` branch.
3. Open **Settings → Pages** in GitHub.
4. Under **Build and deployment**, select **GitHub Actions** as the source.
5. Under **Settings → Secrets and variables → Actions → Variables**, add:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.

Each push to `main` runs the checks, builds `dist`, and deploys it through the
official GitHub Pages actions.
