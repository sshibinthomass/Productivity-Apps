# Productivity Apps

A growing collection of focused React tools in one Vite application.

## Included apps

- **Multi Link Opener** — paste one link per line and open every valid
  destination in a separate tab, either immediately or at a selected
  whole-second interval. The first link always loads immediately.

The opener removes common list markers, wrappers, and invisible copy-paste
characters, reports every adjusted or invalid entry, and accepts up to 100
HTTP/HTTPS links per submission. It never guesses a misspelled domain.

## Local development

Node.js 22.12 or newer is required.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run test:run
npm run lint
npm run build
```

The development server uses:

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
3. Add its title, description, icon, path, accent, and component to
   `src/config/appRegistry.jsx`.

The registry automatically supplies both the home-page card and the route.

## GitHub Pages

Production routes are:

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

Each push to `main` runs the checks, builds `dist`, and deploys it through the
official GitHub Pages actions.
