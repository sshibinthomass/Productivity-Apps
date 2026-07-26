# Firebase Google Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one reusable Firebase Google session to Productivity Apps while keeping Multi Link Opener completely public and allowing future registry entries to require authentication.

**Architecture:** A Firebase client adapter owns SDK calls and is injected into a React `AuthProvider` for deterministic testing. Registry metadata controls a single protected-route boundary, while a public login page and shared header controls provide Google sign-in and sign-out. Firebase remains an identity provider only; GitHub Pages continues to host the static SPA.

**Tech Stack:** React 19.2.8, React DOM 19.2.8, React Router DOM 7.18.1, Firebase JavaScript SDK 12.16.0, Vite 8.1.5, Vitest 4.1.10, Testing Library React 16.3.2, jsdom 29.1.1, ESLint 10.0.1

## Global Constraints

- Use one Firebase project for the entire Productivity Apps website.
- Google is the only sign-in provider.
- Any Google account is allowed; there is no email or Workspace-domain allowlist.
- `/`, `/login`, `*`, and `/multi-link-opener` remain public.
- `appRegistry` is the single source of truth for app access through the required `requiresAuth` boolean.
- Firebase supplies identity only; Firebase Hosting, Firestore, Cloud Functions, Admin SDK, and roles are excluded.
- Vite's production base remains exactly `/Productivity-Apps/`.
- Firebase web configuration comes from `VITE_FIREBASE_*` variables; no service-account key, client secret, or private credential enters the browser bundle.
- Return locations must begin with `/`, must not begin with `//`, and must not point back to `/login`.
- Authentication failures must never disable, hide, or redirect away from Multi Link Opener.

---

## File Map

- `package.json` and `package-lock.json`: Firebase, Testing Library, and jsdom dependencies.
- `vite.config.js`: jsdom test environment.
- `.env.example`: documented Firebase web configuration keys.
- `src/auth/firebaseClient.js`: environment validation and Firebase SDK adapter.
- `src/auth/firebaseClient.test.js`: configuration and error-message tests.
- `src/auth/AuthContext.jsx`: shared React session state and actions.
- `src/auth/AuthContext.test.jsx`: auth observer, sign-in, failure, and cleanup tests.
- `src/auth/ProtectedRoute.jsx`: loading, redirect, and authenticated rendering boundary.
- `src/auth/ProtectedRoute.test.jsx`: route-boundary behavior tests.
- `src/auth/returnPath.js`: safe internal return-location validation.
- `src/auth/returnPath.test.js`: open-redirect and login-loop tests.
- `src/pages/LoginPage.jsx`: public Google login and post-login return flow.
- `src/pages/LoginPage.test.jsx`: login success, error, and existing-session tests.
- `src/components/AuthControls.jsx`: header loading, sign-in, user, and sign-out states.
- `src/components/AuthControls.test.jsx`: accessible header-control tests.
- `src/components/Layout.jsx`: shared header placement for authentication controls.
- `src/App.jsx`: public login route and registry-controlled protected routes.
- `src/App.test.jsx`: signed-out public-route integration coverage.
- `src/main.jsx`: application-level `AuthProvider`.
- `src/config/appRegistry.jsx`: explicit public metadata for Multi Link Opener.
- `src/config/appRegistry.test.jsx`: required access metadata assertions.
- `src/styles/global.css`: login, auth-control, loading, and responsive styles.
- `.github/workflows/deploy-pages.yml`: production Vite configuration from repository variables.
- `README.md`: Firebase Console, local environment, and GitHub Pages configuration.

---

### Task 1: Firebase Client Boundary and Configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.js`
- Create: `.env.example`
- Create: `src/auth/firebaseClient.js`
- Create: `src/auth/firebaseClient.test.js`

**Interfaces:**
- Produces: `readFirebaseConfig(env): { config: object | null, configurationError: string | null }`.
- Produces: `getAuthErrorMessage(error): string`.
- Produces: `createFirebaseClient(env): { configurationError, observeAuthState, signInWithGoogle, signOutUser }`.
- Produces: singleton `firebaseClient`.

- [ ] **Step 1: Install the locked runtime and test dependencies**

Run:

```powershell
npm install firebase@12.16.0
npm install --save-dev @testing-library/react@16.3.2 jsdom@29.1.1
```

Set `test.environment` in `vite.config.js` to `jsdom`.

- [ ] **Step 2: Write failing configuration and error-mapping tests**

Create focused tests that require all four values and verify Firebase errors:

```js
expect(readFirebaseConfig({})).toEqual({
  config: null,
  configurationError:
    'Firebase sign-in is not configured. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.',
})

expect(
  readFirebaseConfig({
    VITE_FIREBASE_API_KEY: 'key',
    VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'example',
    VITE_FIREBASE_APP_ID: 'app-id',
  }).config,
).toEqual({
  apiKey: 'key',
  authDomain: 'example.firebaseapp.com',
  projectId: 'example',
  appId: 'app-id',
})

expect(getAuthErrorMessage({ code: 'auth/popup-blocked' })).toContain(
  'allow pop-ups',
)
expect(getAuthErrorMessage({ code: 'auth/popup-closed-by-user' })).toContain(
  'closed',
)
expect(getAuthErrorMessage({ code: 'auth/network-request-failed' })).toContain(
  'network',
)
expect(getAuthErrorMessage({ code: 'auth/unauthorized-domain' })).toContain(
  'not authorized',
)
```

Run:

```powershell
npm run test:run -- src/auth/firebaseClient.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement configuration validation and the Firebase adapter**

Use modular imports from `firebase/app` and `firebase/auth`. Reuse the default
Firebase app during Vite hot reload with `getApps()`/`getApp()`. The configured
adapter must call:

```js
onAuthStateChanged(auth, onUser, onError)
signInWithPopup(auth, new GoogleAuthProvider())
signOut(auth)
```

When configuration is missing, return an inert adapter with the configuration
message and do not initialize Firebase. The inert adapter's auth operations
reject with an error whose `code` is `auth/configuration-not-found`.

Create `.env.example` with exactly:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 4: Run the client tests**

Run:

```powershell
npm run test:run -- src/auth/firebaseClient.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the client boundary**

```powershell
git add package.json package-lock.json vite.config.js .env.example src/auth/firebaseClient.js src/auth/firebaseClient.test.js
git commit -m "feat: add Firebase authentication client"
```

---

### Task 2: Shared Authentication Provider

**Files:**
- Create: `src/auth/AuthContext.jsx`
- Create: `src/auth/AuthContext.test.jsx`

**Interfaces:**
- Consumes: `firebaseClient`.
- Produces: `AuthProvider({ children, client? })`.
- Produces: `useAuth(): { user, isAuthLoading, authError, signInWithGoogle, signOutUser }`.
- `signInWithGoogle()` resolves to the Firebase user or `null`.
- `signOutUser()` resolves to `true` on success or `false` on failure.

- [ ] **Step 1: Write failing provider tests with an injected fake client**

Use Testing Library's `render`, `screen`, `fireEvent`, and `waitFor`. Capture
the auth observer and render a harness that shows context state. Verify:

```jsx
expect(screen.getByRole('status').textContent).toContain('loading')
observer({ uid: '123', displayName: 'Ada', email: 'ada@example.com' })
await waitFor(() =>
  expect(screen.getByTestId('user').textContent).toBe('ada@example.com'),
)
```

Also verify that:

- `signInWithGoogle` calls the client once and resolves its user.
- popup failure maps to `authError` and resolves `null`.
- `signOutUser` delegates and returns `true`.
- the function returned by `observeAuthState` is called on unmount.
- a configuration error skips observation and immediately ends loading.

Run:

```powershell
npm run test:run -- src/auth/AuthContext.test.jsx
```

Expected: FAIL because the provider does not exist.

- [ ] **Step 2: Implement the provider**

Create a context with no default object. `AuthProvider` must initialize
`isAuthLoading` to `!client.configurationError`, subscribe once in an effect,
and return the unsubscribe function. Each operation clears stale errors before
calling the client. Convert caught errors with `getAuthErrorMessage`.

`useAuth` must throw this exact development error when called outside the
provider:

```text
useAuth must be used within AuthProvider.
```

- [ ] **Step 3: Run the provider tests**

Run:

```powershell
npm run test:run -- src/auth/AuthContext.test.jsx
```

Expected: PASS without React `act` warnings.

- [ ] **Step 4: Commit the provider**

```powershell
git add src/auth/AuthContext.jsx src/auth/AuthContext.test.jsx
git commit -m "feat: add shared authentication provider"
```

---

### Task 3: Safe Return Paths, Protected Routes, and Login

**Files:**
- Create: `src/auth/returnPath.js`
- Create: `src/auth/returnPath.test.js`
- Create: `src/auth/ProtectedRoute.jsx`
- Create: `src/auth/ProtectedRoute.test.jsx`
- Create: `src/pages/LoginPage.jsx`
- Create: `src/pages/LoginPage.test.jsx`

**Interfaces:**
- Produces: `getSafeReturnPath(value): string`.
- Produces: `ProtectedRoute({ children })`.
- Consumes: `useAuth()` and React Router location state `{ from: string }`.
- Produces: public `/login` page component.

- [ ] **Step 1: Write and pass safe-return-path tests**

Start with:

```js
expect(getSafeReturnPath('/private?tab=1#item')).toBe(
  '/private?tab=1#item',
)
expect(getSafeReturnPath('https://attacker.example')).toBe('/')
expect(getSafeReturnPath('//attacker.example')).toBe('/')
expect(getSafeReturnPath('/login')).toBe('/')
expect(getSafeReturnPath(null)).toBe('/')
```

Implement the smallest pure function that passes. Run:

```powershell
npm run test:run -- src/auth/returnPath.test.js
```

Expected: PASS.

- [ ] **Step 2: Write failing protected-route tests**

Mock `useAuth`, use `MemoryRouter` with routes for `/private` and `/login`,
and verify:

- Loading renders `Checking your session…` and does not render children.
- Signed out replaces `/private?tab=1#item` with `/login` and preserves
  `state.from === '/private?tab=1#item'`.
- Signed in renders the protected content.

Run:

```powershell
npm run test:run -- src/auth/ProtectedRoute.test.jsx
```

Expected: FAIL because the boundary does not exist.

- [ ] **Step 3: Implement the protected boundary**

Construct the stored return path from:

```js
`${location.pathname}${location.search}${location.hash}`
```

Use `<Navigate to="/login" replace state={{ from }} />` only after loading
finishes. Loading must use `role="status"` and `aria-live="polite"`.

- [ ] **Step 4: Write failing login-page tests**

Mock `useAuth` and render `/login` with an optional location state. Verify:

- The page has one `Continue with Google` button.
- Clicking it calls `signInWithGoogle`.
- A returned user navigates with `replace` to the validated `from`.
- A `null` result stays on `/login` and displays the context error.
- An already signed-in user is redirected without showing the button.
- An unsafe `from` redirects to `/`.

- [ ] **Step 5: Implement and verify the login page**

Disable the button while its promise is pending. Use:

```js
const signedInUser = await signInWithGoogle()
if (signedInUser) {
  navigate(returnPath, { replace: true })
}
```

Run:

```powershell
npm run test:run -- src/auth/returnPath.test.js src/auth/ProtectedRoute.test.jsx src/pages/LoginPage.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit routing and login**

```powershell
git add src/auth/returnPath.js src/auth/returnPath.test.js src/auth/ProtectedRoute.jsx src/auth/ProtectedRoute.test.jsx src/pages/LoginPage.jsx src/pages/LoginPage.test.jsx
git commit -m "feat: add protected routes and Google login"
```

---

### Task 4: Application Integration and Public-App Guarantee

**Files:**
- Create: `src/components/AuthControls.jsx`
- Create: `src/components/AuthControls.test.jsx`
- Modify: `src/components/Layout.jsx`
- Modify: `src/App.jsx`
- Create: `src/App.test.jsx`
- Modify: `src/main.jsx`
- Modify: `src/config/appRegistry.jsx`
- Modify: `src/config/appRegistry.test.jsx`
- Modify: `src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth`, `ProtectedRoute`, and `LoginPage`.
- Changes registry entry shape to include required `requiresAuth: boolean`.
- Produces shared header authentication controls.

- [ ] **Step 1: Extend failing registry and public-route tests**

Require every registry entry to have a boolean:

```js
expect(appRegistry[0]).toMatchObject({
  id: 'multi-link-opener',
  requiresAuth: false,
})
expect(appRegistry.every((app) => typeof app.requiresAuth === 'boolean')).toBe(
  true,
)
```

Create `src/App.test.jsx` with an App routing test that uses an injected fake
auth client, renders `/multi-link-opener` while signed out, and asserts the
link form is present and the login page is absent.

- [ ] **Step 2: Write failing header-control tests**

Verify:

- Loading exposes a session status.
- Signed out renders a `/login` link named `Sign in with Google`.
- Signed in renders display name, email fallback, optional avatar alt text,
  and a `Sign out` button.
- Clicking `Sign out` calls `signOutUser`.

- [ ] **Step 3: Implement header controls and registry-driven routing**

Add `requiresAuth: false` to Multi Link Opener. Add `/login` explicitly before
the registry routes. Generate each app route with:

```jsx
const page = <Page />

return (
  <Route
    key={app.id}
    path={app.path}
    element={
      app.requiresAuth ? (
        <ProtectedRoute>{page}</ProtectedRoute>
      ) : (
        page
      )
    }
  />
)
```

Wrap `<App />` with `<AuthProvider>` inside `BrowserRouter` in `main.jsx`.
Place `AuthControls` beside the existing `All apps` link in a semantic header
navigation container.

- [ ] **Step 4: Add responsive authentication and login styles**

Use existing color and typography tokens. Add styles for:

- `.site-header__actions`
- `.auth-controls`, `.auth-controls__identity`, `.auth-controls__avatar`
- `.auth-link`, `.auth-sign-out`
- `.auth-loading`
- `.login-page`, `.login-card`, `.login-card__google`, `.login-card__error`

At 520px, preserve the product mark symbol, keep a minimum 44px action target,
hide only the signed-in email label when space is constrained, and retain an
accessible name on every control.

- [ ] **Step 5: Run integration tests**

Run:

```powershell
npm run test:run -- src/config/appRegistry.test.jsx src/components/AuthControls.test.jsx src/apps/multi-link-opener/MultiLinkOpenerPage.test.jsx
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit application integration**

```powershell
git add src
git commit -m "feat: integrate optional authentication"
```

---

### Task 5: Firebase Project, GitHub Pages Variables, and Documentation

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Local only: `.env.local`

**Interfaces:**
- Consumes the four `VITE_FIREBASE_*` repository variables during the build.
- Produces a Firebase project with Google enabled and authorized local and
  production hostnames.

- [ ] **Step 1: Create the Firebase project and web app**

Using the requested in-app browser or an authenticated Firebase CLI:

1. Create one project with display name `Productivity Apps`.
2. Do not enable Google Analytics unless it is already required elsewhere.
3. Register a Web app named `Productivity Apps Web`.
4. Open Authentication and enable the Google provider with the owning Google
   account as the support email.
5. Add `localhost` to authorized domains.
6. Add the repository's GitHub Pages hostname
   `sshibinthomass.github.io` to authorized domains.
7. Copy only `apiKey`, `authDomain`, `projectId`, and `appId` into
   `.env.local`.

If browser authentication is required, pause and let the user complete Google
sign-in in the in-app browser before continuing.

- [ ] **Step 2: Supply production build variables**

Add the same four public web-configuration values as GitHub repository
variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Expose them on the workflow's `Build application` step:

```yaml
env:
  VITE_FIREBASE_API_KEY: ${{ vars.VITE_FIREBASE_API_KEY }}
  VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
  VITE_FIREBASE_PROJECT_ID: ${{ vars.VITE_FIREBASE_PROJECT_ID }}
  VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}
```

- [ ] **Step 3: Document the exact setup and access model**

Update README with Firebase project creation, Google provider enablement,
authorized domains, `.env.local`, repository variables, and this registry
example:

```jsx
{
  id: 'account-tool',
  path: '/account-tool',
  requiresAuth: true,
  // existing registry fields
}
```

State explicitly that Multi Link Opener is public and that route protection is
not a backend authorization boundary.

- [ ] **Step 4: Verify configured production output**

With `.env.local` populated, run:

```powershell
npm run build
```

Expected: exit code 0. Search `dist` for the private variable names and verify
none are present; Firebase's public configuration values may appear.

- [ ] **Step 5: Commit deploy configuration and documentation**

```powershell
git add .github/workflows/deploy-pages.yml README.md
git commit -m "docs: configure Firebase Google authentication"
```

Do not add `.env.local`.

---

### Task 6: Full Verification and Browser Acceptance

**Files:**
- Verify all files changed by Tasks 1–5.

**Interfaces:**
- Consumes the complete application and configured Firebase project.
- Produces evidence that public and authenticated paths work locally.

- [ ] **Step 1: Run automated quality gates**

Run:

```powershell
npm run test:run
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Start the local app**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Keep the yielded process running for browser verification.

- [ ] **Step 3: Verify public behavior in the in-app browser**

At `http://127.0.0.1:5173/multi-link-opener` while signed out:

- The page renders without visiting `/login`.
- The textarea, delay input, and `Open links` action are usable.
- Refresh remains on `/multi-link-opener`.
- The header offers `Sign in with Google`.

- [ ] **Step 4: Verify Google authentication in the in-app browser**

At `/login`:

- `Continue with Google` opens Google's account chooser.
- Complete sign-in with any Google account.
- The header shows the Google identity.
- Refresh restores the session.
- `Sign out` returns the header to signed-out state.
- Multi Link Opener remains rendered after sign-out.

If an automated browser cannot complete the Google account chooser, the user
completes that sensitive step in the same in-app browser and verification
continues afterward.

- [ ] **Step 5: Inspect repository state**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; `.env.local` is ignored; only intentional
uncommitted changes, if any, are reported.

---

## Final Verification

- [ ] All tests pass.
- [ ] ESLint passes.
- [ ] The configured production build passes.
- [ ] Multi Link Opener works while signed out.
- [ ] Google sign-in, refresh persistence, and sign-out work in a real browser.
- [ ] Only registry entries with `requiresAuth: true` are protected.
- [ ] GitHub Pages receives all four public Firebase web values at build time.
- [ ] No private credential or `.env.local` is tracked.
