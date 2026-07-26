# Arvenilo Network Frontend Design

**Status:** Approved for implementation  
**Date:** 2026-07-26  
**Design source:** `Arvenilo-Design-Handoff/`  
**Product:** Arvenilo Network  
**Available sub-application:** Multi Link Opener

## Outcome

Rebrand the existing Productivity Apps interface as **Arvenilo Network** and
reorganize it into an expandable application network. Multi Link Opener remains
the first working sub-application at `/multi-link-opener`; additional tools are
shown only as explicitly labelled `COMING SOON` entries.

The redesign changes presentation and information architecture without changing
the existing link parsing, validation, scheduling, or tab-opening behavior.

## Design direction

The selected direction is **Network Console**: a dark, precise parent shell
paired with calm, task-focused application workspaces. It expresses the
handoff's Precision Spatial language through real hierarchy, connected
relationships, one focal signal, and restrained motion rather than decorative
technology motifs.

The interface must feel advanced, technical, calm, and useful. It must not use
glassmorphism, neon glow, decorative circuit patterns, fake coordinates, or
unsupported system claims.

## Brand system

### Identity

- Use the approved transparent Arvenilo Network lockup from
  `03-Logos/Transparent-PNG/03-arvenilo-network-transparent.png`.
- Copy the asset into `public/brand/` without redrawing, recoloring, cropping,
  stretching, shadowing, or adding glow.
- The full lockup appears in the global header. A compact approved transparent
  asset,
  `03-Logos/Transparent-PNG/03-arvenilo-network-transparent-logo.png`, appears
  in the mobile header and favicon.
- Replace all visible `Productivity Apps` naming, `P/` marks, metadata, title,
  favicon references, descriptions, and footer language with Arvenilo Network
  naming.

### Palette

The interface uses the handoff tokens verbatim:

- Spatial Void `#020A0C`
- Spatial Ink `#081D21`
- Spatial Surface `#0D2A2E`
- Spatial Surface Raised `#12363A`
- Reality Mist `#F4FBFA`
- Interface White `#FFFFFF`
- Signal Mint `#5EEAD4`
- Digital Violet `#7456F1`
- Anchor Gold `#F4B942`
- Context Slate `#4D6265`
- Mist Slate `#A8B9BB`
- Dark Border `#1D454A`
- Light Border `#C9DADA`
- Mint Wash `#D8F8F2`
- Violet Wash `#E9E5FF`
- Gold Wash `#FFF1CF`
- Error Dark `#B83E4B`
- Error Light `#FF9099`

Signal Mint identifies primary actions, focus, and success. Digital Violet
identifies connected or future capability. Anchor Gold appears only at the
single selected signal point in the home hero. Red remains reserved for errors.

### Typography

- Self-host Sora Variable for display text.
- Self-host Inter Variable for body and UI text.
- Self-host IBM Plex Mono for short status, category, and utility labels.
- Use `font-display: swap`.
- Apply the handoff's responsive scale, heading weight near `650`, balanced
  headings, readable body line-height, and `66ch` paragraph maximum.

### Shape and motion

- Controls use `10px` radius, cards `16px`, and major stages `24px`.
- Structure comes from solid surfaces and one-pixel cool borders before shadow.
- Hover and press feedback uses `120–180ms`; UI reveals use `180–300ms`.
- The hero network performs one restrained convergence reveal.
- `prefers-reduced-motion: reduce` removes transforms and effectively disables
  animated transitions without removing information.

## Information architecture

### Global shell

The application keeps the existing router and registry-driven composition:

- `/` — Arvenilo Network application directory
- `/multi-link-opener` — working Multi Link Opener sub-application
- `*` — Arvenilo-branded not-found state

The global header contains the approved Arvenilo Network identity and, on
sub-application routes, a clear `Network index` link back to `/`. The footer
uses the brand promise `Where Intelligence Meets Reality.` and identifies the
surface as `Arvenilo Network`.

### Home page

The home page has two primary sections.

1. **Network hero**
   - Utility label: `ARVENILO NETWORK / PRODUCTIVITY SYSTEM`
   - Outcome-led heading: `Small tools. Connected work.`
   - Plain-language introduction explaining that each application removes
     friction from a focused task.
   - Status summary showing one available application and additional announced
     nodes.
   - A responsive spatial network diagram built from semantic HTML and CSS.
     It represents the available Multi Link Opener node connected to future
     nodes. One Anchor Gold signal point is the dominant focus.

2. **Application network**
   - Section heading and compact count.
   - Multi Link Opener is an interactive card labelled `AVAILABLE NOW`.
   - Three registry-backed future cards are labelled `COMING SOON`:
     `Text Formatter`, `Focus Timer`, and `Quick Notes`.
   - Future cards are non-interactive articles, not disabled links or buttons.
   - Every card uses the same information order: status, icon, title,
     one-sentence outcome, and availability-specific action text.

### Multi Link Opener

The route becomes a task-first application workspace:

- A compact breadcrumb establishes `Arvenilo Network / Multi Link Opener`.
- The page header states the outcome and keeps explanatory copy constrained.
- The workbench uses a dark guidance rail and a Reality Mist form surface on
  desktop.
- On mobile, the form is placed before the guidance content so the primary task
  appears first.
- The form retains the existing link input, live count, delay control, actions,
  status feedback, adjusted-link details, and error recovery copy.
- Visual states use the Arvenilo semantic roles without changing the underlying
  behavior.

## Component boundaries

### `Layout`

Owns global brand identity, the route-aware return link, main landmark, and
footer. It does not own page-specific hero or card content.

### `BrandLogo`

Renders either the copied full lockup or compact logo asset, selected through a
`variant: 'lockup' | 'symbol'` prop, with an `Arvenilo Network` accessible
label. It does not reconstruct the identity with CSS.

### `HomePage`

Owns hero messaging and composes the spatial signal and application directory
from registry data.

### `NetworkSignal`

Renders the meaningful home-page connection diagram and its text alternative.
It is decorative to screen readers because the same availability relationship
is expressed in the application cards and status summary.

### `AppCard`

Renders either:

- an interactive route link for `available` entries, or
- a non-interactive article for `coming-soon` entries.

The registry supplies status, label, description, icon, path where applicable,
and accent.

### `MultiLinkOpenerPage`

Keeps its existing state and submission behavior. The change is limited to
markup organization, brand copy, and responsive presentation.

## Registry model

Each application entry has this shape:

```js
{
  id: string,
  title: string,
  description: string,
  category: string,
  status: 'available' | 'coming-soon',
  path: string | null,
  icon: ReactComponent,
  accent: 'mint' | 'violet',
  component: ReactComponent | null,
}
```

Only entries with `status: 'available'`, a non-null `path`, and a non-null
`component` become routes. All entries appear in the application network.

## Responsive behavior

### Mobile: 320–767px

- Use a `20px` gutter and one-column layout.
- Show the compact brand asset with a minimum 44px interaction target.
- Keep headings within the viewport with no horizontal clipping.
- Stack the hero copy, status summary, and network signal.
- Stack application cards.
- Put the Multi Link Opener form before its guidance panel.
- Make primary and secondary actions full-width where needed.
- Preserve minimum 44px touch targets and logical DOM/focus order.

### Tablet: 768–1023px

- Use a `32px` gutter.
- Keep the hero split only while both columns remain readable.
- Use a two-column application grid.
- Stack the tool workbench when the side-by-side layout becomes crowded.

### Desktop: 1024px and above

- Use a `48px` gutter, increasing to `64px` at 1440px.
- Cap the shell at `1600px`.
- Use the 12-column hierarchy for hero and workspace composition.
- Display three application cards per row.
- Use a two-column tool workbench with the guidance rail subordinate to the
  form.

The layout must be visually checked at widths `320`, `390`, `768`, `1024`,
`1440`, and `1920px`.

## Accessibility

- Target WCAG 2.2 AA.
- Preserve semantic landmarks and heading order.
- Give every interactive control keyboard access and a visible `3px`
  Signal Mint focus ring with `3px` offset.
- Never communicate availability, success, warning, or error through color
  alone.
- Keep all touch targets at least `44 × 44px`.
- Provide useful accessible names for icons and navigation.
- Keep future cards non-interactive to avoid misleading keyboard users.
- Preserve `aria-live` feedback in the Multi Link Opener.
- Ensure core tasks work when motion or nonessential imagery is unavailable.
- Prevent horizontal overflow at all required viewport widths and at 200% zoom.

## Error and empty states

- The Multi Link Opener idle state continues to explain that it is ready for
  input.
- Validation, duplicate, scheduling, adjusted-link, popup-blocking, and limit
  messages retain their existing specific recovery guidance.
- The not-found page clearly states that the requested application is not in
  the network and provides a `Return to network` action.
- Future applications never navigate to placeholder pages; their cards state
  `COMING SOON` and `Announced for the network`.

## Testing and verification

Automated tests will verify:

- Arvenilo Network identity and copy render in the global shell.
- The home page renders one available application and three coming-soon
  applications; the available entry is a link and coming-soon entries are
  non-interactive articles.
- Only available registry entries become routes.
- The Multi Link Opener retains its form labels, controls, result states, and
  behavior.
- The not-found page uses the new brand language.

Fresh verification must include:

- `npm run test:run`
- `npm run lint`
- `npm run build`
- Browser screenshots and DOM inspection at the required responsive widths
- Keyboard-focus inspection of primary navigation and form controls
- Console inspection for errors and warnings

## Out of scope

- Adding working productivity tools beyond Multi Link Opener
- Changing link parsing, validation, scheduling, or tab-opening behavior
- Adding authentication, persistence, analytics, backend services, or network
  requests
- Redrawing or recoloring any approved Arvenilo logo
- Introducing external UI, icon, animation, or font dependencies
