# Semestra login screen enhancement — design specification

**Status:** approved for planning
**Date:** 2026-08-12
**Scope:** the `/login` screen only

## Goal

Make signing in feel like a calm return to a serious academic plan. The page should carry Semestra's Field Notes identity without changing its email/password authentication behaviour or reshaping the shared registration screen.

## Constraints and decisions

- Preserve the existing email/password submit flow, error handling, password reveal control, autocomplete attributes, and redirect to `/dashboard`.
- Keep Google and Apple choices visible as disabled placeholders. They must say that they are coming soon and must not look like working sign-in methods.
- Use the supplied public assets at `/googleicon.svg` and `/appleicon.svg` for the provider marks rather than generated artwork or replacement inline marks.
- Do not generate imagery. The approved Field Notes system is CSS/SVG-led, and new raster art would not improve this screen.
- Do not modify registration, shared authentication layout behaviour, backend/API behaviour, or OAuth integration. Login-specific style additions must be scoped so `/register` is unaffected.

## Visual direction

The screen keeps the existing warm paper and charcoal/ink vocabulary, but the form becomes a composed login page instead of an unheaded collection of controls.

### Structure

```
existing shared auth sheet
└── login-only <main>
    ├── compact Semestra brand row (mobile only)
    ├── FIELD NOTES · SIGN IN eyebrow
    ├── Welcome back heading + one practical supporting sentence
    ├── two provider placeholders with supplied SVG marks and COMING SOON tags
    ├── ruled divider: Use your email
    ├── email/password form
    │   ├── mono labels, compact inputs, 44px password reveal target
    │   ├── linked field/form error callout when sign-in fails
    │   └── cobalt Sign in action
    └── quiet account-creation link
```

On desktop, the existing product-preview panel remains the wider brand context. On smaller screens, where that panel is hidden, the compact Semestra brand row restores product identity without pushing the form's primary action below the fold.

### Token and type use

- Background/surface: existing `--fn-canvas` and `--fn-paper` ledger-paper treatment.
- Ink/rules: `--fn-ink`, `--fn-muted`, and crisp `--fn-rule` dividers.
- Emphasis: cobalt only for the primary action/focus; oxide only for the small rule accent and actionable error treatment.
- Typography: DM Sans for the heading/supporting copy; IBM Plex Mono for the eyebrow, labels, provider status, divider, and error metadata.
- Controls retain the design system's 6px radius and avoid card stacks, gradients, or heavy shadows.

### Signature detail

The provider area is treated as an honest availability ledger: each real provider mark is followed by the provider name and a compact mono `COMING SOON` tag. It reinforces the product's precise, candid tone instead of presenting unavailable options as affordances.

## Interaction and accessibility

- Wrap the content in a semantic `<main>` with a unique `<h1>`.
- Give the mobile brand mark/title text; decorative SVGs and rule details are hidden from assistive technology.
- Render the provider buttons as disabled controls with visible `Coming soon` text. Add a succinct explanation that email sign-in is available now.
- Make the password visibility button at least 44 × 44 px, preserve its accessible label, and expose `aria-pressed` for its state.
- Associate the sign-in error with the affected inputs/form via IDs and `aria-describedby`; preserve `role="alert"` for announcement.
- Keep high-contrast `:focus-visible` states and honour reduced-motion preferences.
- Use visible labels for all controls and do not rely on provider colour or the SVG alone to identify an option.

## Responsive behaviour

- Mobile: show the compact brand row, use 44px targets, retain a single comfortable reading column, and keep the email sign-in action reachable without scrolling excessively.
- Desktop: preserve the current two-column auth shell; the login content remains within its restrained reading width and does not duplicate the full desktop brand treatment.

## Implementation boundaries

Expected changes are limited to the login route and login-scoped Field Notes styles. The existing provider icon component is not required by the refreshed login route once the supplied public SVG files are used. No new dependencies, images, API calls, routes, or auth states are introduced.

## Verification criteria

1. `/login` has a clear semantic heading and an identifiable mobile brand treatment.
2. Google and Apple appear with the supplied SVG assets, are visibly marked `Coming soon`, and cannot trigger incomplete OAuth flows.
3. Email/password login still submits exactly as before, including success redirect, loading state, error alert, and password reveal.
4. Keyboard users can see focus, operate the password reveal control, and receive sign-in errors associated with the form.
5. `/register` and other auth behaviour remain visually and functionally unchanged.
6. Frontend lint, type-check, tests, and production build pass after implementation.

## Self-review

- No unresolved placeholders, TODOs, or ambiguous scope remain.
- The design intentionally changes only `/login`; shared layout changes are excluded so registration cannot be altered accidentally.
- Disabled OAuth placeholders are explicit, not deceptive.
- CSS/SVG usage matches the Field Notes reference and makes image generation unnecessary.
