# Delayed Link Opening Design

## Goal

Add an optional delay between destinations in Multi Link Opener while keeping
every destination in a separate browser tab.

## User Experience

The tool page adds a numeric field labeled "Delay between links" below the
link textarea and above the action buttons.

- The value is measured in seconds.
- The default is `0`.
- The minimum is `0` and the maximum is `60`.
- Only whole seconds are accepted.
- Helper text explains that the first link opens immediately.

For a delay of two seconds, the navigation schedule is:

- Link 1 at 0 seconds.
- Link 2 at 2 seconds.
- Link 3 at 4 seconds.
- Each subsequent link at another two-second interval.

A zero-second delay preserves the current behavior.

## Browser Behavior

Browsers generally block tabs created by timers because delayed calls no
longer have the original user activation. To avoid that, the application
reserves one blank tab per valid URL synchronously during the button click.

After reservation:

1. The first reserved tab navigates immediately.
2. Each remaining reserved tab navigates after `index × delay`.
3. Every reserved tab has its opener removed and a no-referrer policy applied
   before navigation.
4. A blocked reservation is counted and excluded from the schedule.

Users may briefly see blank tabs waiting for their scheduled navigation. This
is expected and is explained beside the delay control.

## Result Feedback

When the delay is zero, the existing opened-link message remains.

When the delay is greater than zero, the result panel reports:

- The number of tabs successfully scheduled.
- The selected interval.
- That the first destination is loading immediately.
- Any blocked tabs.
- Any invalid or duplicate entries, using the existing feedback.

The message does not claim that every destination has already loaded while
timers are still pending.

## Implementation Boundaries

`linkUtils.js` continues to own tab reservation and navigation. `openLinks`
accepts an options object containing the delay in milliseconds and an
injectable scheduler for tests. It returns synchronous reservation and blocked
counts.

`MultiLinkOpenerPage.jsx` owns the seconds input, converts seconds to
milliseconds, and passes the delay to `openLinks`. The selected delay is page
state only and is not persisted.

No cancellation, pause, countdown, saved presets, or background service is
included.

## Accessibility and Responsive Layout

- The delay field has a visible label and associated helper text.
- Native number-input keyboard behavior is retained.
- Invalid values are constrained by the control and normalized before use.
- The control remains readable at mobile widths without shrinking the primary
  action below its existing touch-target size.
- Result feedback remains in the existing accessible live region.

## Verification

Automated tests use fake timers and injected tab/scheduler functions to prove:

- All tab reservations happen synchronously.
- The first valid destination navigates immediately.
- A zero-second delay navigates every reserved tab immediately.
- Later destinations navigate at the correct cumulative intervals.
- Blocked tabs are not scheduled.
- Opener and referrer protections remain applied.
- Delay input markup has the correct label, default, minimum, maximum, and
  whole-second step.

Completion also requires lint, production build, desktop/mobile browser checks,
successful GitHub Actions deployment, and a live GitHub Pages verification.
