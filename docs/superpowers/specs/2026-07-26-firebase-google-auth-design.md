# Firebase Google Authentication Design

## Purpose

Add Firebase Authentication to the Productivity Apps React application so any
Google account can establish one shared session across the app suite. The
Multi Link Opener must remain fully usable without signing in. Future apps can
opt into authentication without duplicating login logic.

## Confirmed product decisions

- Use one Firebase project for the entire Productivity Apps website.
- Use Firebase Authentication with Google as the only sign-in provider.
- Allow any Google account; do not enforce an email or Workspace-domain
  allowlist.
- Keep the home page, not-found page, login page, and Multi Link Opener public.
- Let future apps explicitly declare that they require authentication.
- Show authentication controls in the shared site header so a user can sign in
  before opening a protected app.
- When a signed-out user opens a protected app, send them to the login page and
  return them to the requested app after successful sign-in.
- Continue deploying the static application to GitHub Pages. Firebase supplies
  identity only; Firebase Hosting is not part of this change.

## Architecture

The Firebase JavaScript SDK is initialized once in a focused authentication
module. A React `AuthProvider` subscribes to Firebase's auth-state observer and
exposes a small application-facing interface: the current user, whether the
initial session check is still loading, an authentication error, Google
sign-in, and sign-out.

`AuthProvider` wraps the routed application. The existing `Layout` consumes the
shared auth interface through a dedicated header control. Route access is
driven by `src/config/appRegistry.jsx`: each registered app receives a
`requiresAuth` boolean. `App.jsx` wraps only entries whose value is `true` in a
protected-route boundary.

This keeps authentication independent of individual tools:

- Public tools do not import Firebase or inspect the user.
- Protected tools receive a verified client session before their page renders.
- Adding a protected tool requires registry metadata, not custom redirect
  logic.
- A single Firebase user record and browser session work across all tools
  registered in this website.

## Component boundaries

### Firebase client configuration

A module under `src/auth/` reads these Vite variables and initializes one
Firebase app and one Auth instance:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

The application will fail with a clear configuration message when a required
variable is missing. The Firebase web configuration identifies the Firebase
project and is not treated as a server secret, but configuration values remain
environment-specific and are not hard-coded into source files.

An `.env.example` file documents all required values. Local values live in an
ignored `.env.local`. The GitHub Pages workflow obtains the production values
from GitHub repository variables during the Vite build.

### Authentication provider

The provider owns all direct Firebase Auth SDK calls:

- Subscribe with `onAuthStateChanged` on mount and unsubscribe on unmount.
- Keep the application in a loading state until Firebase reports the initial
  user or signed-out state.
- Start Google authentication with `GoogleAuthProvider` and
  `signInWithPopup`.
- Sign out with Firebase `signOut`.
- Clear stale errors before every new sign-in or sign-out attempt.
- Convert Firebase error codes into concise user-facing messages while
  retaining the original error for development diagnostics.

The context interface will expose:

- `user`: the Firebase user or `null`
- `isAuthLoading`: whether the initial session check is unresolved
- `authError`: a user-facing message or `null`
- `signInWithGoogle()`: starts direct Google popup sign-in
- `signOutUser()`: ends the Firebase session

Firebase's normal browser-local persistence is used so a returning user stays
signed in on the same browser. No application-specific access token is stored
in local storage.

### Header authentication control

The shared header displays one of three states:

- Loading: a non-interactive status while Firebase restores the session.
- Signed out: a `Sign in with Google` link or button leading to `/login`.
- Signed in: the user's display name or email, Google profile image when
  available, and a `Sign out` action.

The control must remain keyboard accessible, must not depend on the image for
the user's identity, and must fit the existing mobile header without hiding
the product mark or the `All apps` navigation.

### Login page

`/login` is a public route. It explains that Google sign-in is used for apps
that need an account and includes one `Continue with Google` button.

If the user was sent from a protected route, the router stores that internal
location in navigation state. After sign-in, the login page replaces itself
with the original route. Direct visits and invalid return locations fall back
to `/`. Return locations must begin with one `/` and must not begin with `//`,
preventing an external redirect.

An already signed-in user visiting `/login` is redirected to the validated
return location or `/`.

### Protected route boundary

The boundary has three deterministic states:

- While authentication is loading, render an accessible loading status and do
  not redirect.
- When signed out, replace the protected route with `/login` and preserve the
  requested internal location.
- When signed in, render the protected app.

The route boundary authenticates a user; it does not implement roles,
permissions, subscriptions, or per-user authorization.

### App registry

Every entry in `appRegistry` must declare `requiresAuth`.

The Multi Link Opener entry uses:

```js
requiresAuth: false
```

Future apps that need a Google account use:

```js
requiresAuth: true
```

The home card remains visible for both public and protected apps. Protected
cards may display an account-required label later, but that label is not
required for the authentication foundation.

## User flows

### Optional sign-in from a public page

1. The user selects `Sign in with Google` in the header.
2. The public `/login` page opens.
3. The user selects `Continue with Google`.
4. Firebase opens Google's account chooser.
5. After success, the user returns to the home page.
6. Multi Link Opener remains usable throughout, including when the user cancels
   the popup.

### Opening a protected app while signed out

1. The user navigates to an app whose registry entry has
   `requiresAuth: true`.
2. The route boundary waits for the initial Firebase auth check.
3. When Firebase confirms there is no user, the boundary redirects to
   `/login` and stores the original internal location.
4. Successful Google sign-in returns the user to that app.

### Signing out

1. The user selects `Sign out` in the shared header.
2. Firebase clears the session and the header switches to the signed-out
   state.
3. Public pages remain where they are and remain usable.
4. If the user is currently inside a protected app, its route boundary sends
   them to `/login`.

## Error handling

The interface provides specific, recoverable messages for:

- User closes the Google popup: remain on the login page and allow retry.
- Browser blocks the popup: ask the user to allow popups and retry.
- Network failure: state that sign-in could not reach Google and allow retry.
- Unauthorized deployment domain: identify site configuration as the problem
  without exposing raw Firebase details to the user.
- Missing Firebase environment variables: render a configuration error instead
  of crashing or silently behaving as signed out.
- Other Firebase failures: show a generic sign-in failure and log the original
  error in development.

Authentication errors never disable or redirect away from Multi Link Opener.

## Firebase Console and deployment setup

The implementation guide will require these one-time console steps:

1. Create one Firebase project for Productivity Apps.
2. Register a Web app and copy its web configuration values.
3. Open Authentication, configure the consent/support email, and enable the
   Google provider.
4. Add `localhost` to Authentication authorized domains for local development;
   Firebase projects created after April 28, 2025 do not add it automatically.
5. Add the production GitHub Pages hostname, such as
   `<github-user>.github.io`, to authorized domains. Firebase authorizes the
   hostname, not `/Productivity-Apps/`.
6. Add the four production configuration values as GitHub repository
   variables and expose them only to the Vite build step.
7. Keep the existing GitHub Pages base path and SPA fallback behavior.

No service-account key, Firebase Admin SDK credential, OAuth client secret, or
private key belongs in this repository or in the browser build.

## Security model

Client route protection controls the interface but is not a trusted backend
authorization boundary. Any future Firestore, Storage, Cloud Function, or
external API integration must independently verify the Firebase user and
enforce access through server-side checks or Firebase Security Rules.

Firebase ID tokens are managed by the Firebase SDK. The application does not
copy them into custom local storage, query strings, analytics events, or logs.
Only the minimum Google profile data required for the header is displayed:
display name, email fallback, and optional profile image.

## Testing strategy

Firebase SDK calls will sit behind the authentication provider boundary so
tests can use deterministic mocks without contacting Google.

Automated coverage must prove:

- The provider represents loading, signed-out, signed-in, error, and sign-out
  transitions correctly.
- The auth observer is unsubscribed during cleanup.
- The login page starts Google sign-in, shows mapped errors, validates its
  return location, and redirects signed-in users.
- A protected registry entry waits during auth restoration, redirects a
  signed-out user, and renders for a signed-in user.
- Multi Link Opener declares `requiresAuth: false`.
- Multi Link Opener renders and operates without a Firebase user.
- Signing out from a public route does not redirect that route.
- The application reports incomplete Firebase configuration clearly.
- The production build succeeds when all documented Vite variables are
  supplied.

Manual browser verification must cover local Google popup sign-in, session
restoration after refresh, sign-out, a direct visit to Multi Link Opener while
signed out, and a direct visit to one test protected route or protected-route
fixture.

## Acceptance criteria

- Any Google account can sign in from the shared application interface.
- A successful sign-in persists across refreshes in the same browser.
- The header accurately represents loading, signed-out, and signed-in states.
- Signed-out users can open, refresh, and fully use Multi Link Opener without
  seeing the login page.
- Only registry entries with `requiresAuth: true` redirect signed-out users.
- Successful sign-in returns the user to the protected route they requested.
- Sign-out removes access to protected routes without disrupting public tools.
- Local development and GitHub Pages production are both authorized in
  Firebase.
- No private server credential is added to the browser application,
  repository, or GitHub Pages artifact.
- Tests, lint, and production build pass.

## Non-goals

- Email/password, phone, anonymous, Apple, Microsoft, or GitHub sign-in
- Account linking or deletion UI
- Roles, admin permissions, subscription checks, or organization restrictions
- Firestore user profiles or application-data persistence
- Firebase Hosting, Cloud Functions, or Admin SDK integration
- Restricting Multi Link Opener or hiding it from signed-out users
