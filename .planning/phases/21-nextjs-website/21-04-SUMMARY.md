---
phase: 21-nextjs-website
plan: 04
subsystem: ui
tags: [nextjs, tailwind, react, typescript, marketing-site, lucide-react]

# Dependency graph
requires:
  - phase: 21-nextjs-website
    provides: Next.js 15 scaffold, root layout, Nav, Footer, Tailwind v4 brand tokens

provides:
  - Download page at /download matching Download.png layout (hero, phone mockup, 3-col grid, teal CTA)
  - Pricing stub page at /pricing preventing 404 with branded coming-soon content

affects:
  - Future phases adding real pricing plans (replace stub)
  - Any phase linking to /download or /pricing from other pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component page with metadata export for SEO title/description
    - Inline phone mockup using Tailwind classes (no image asset needed)
    - Feature grid using typed array + .map() with Icon component pattern

key-files:
  created:
    - apps/web/app/download/page.tsx
    - apps/web/app/pricing/page.tsx
  modified: []

key-decisions:
  - "PLAY_INSTALLED badge omitted — installed-detection JS is unreliable; both store buttons use default state with href='#'"
  - "Phone mockup built from Tailwind classes only — no image asset required, keeps design flexible"
  - "Pricing page is a minimal stub — no layout decisions locked in before real pricing is defined"

patterns-established:
  - "App store button pattern: black pill with SVG icon + two-line text (label + store name)"
  - "Trust badge pattern: small icon + muted text with bolded number"

# Metrics
duration: ~2min
completed: 2026-03-07
---

# Phase 21 Plan 04: Download + Pricing Stub Summary

**Download page with hero, phone mockup, 3-column mobile features grid, and teal CTA section — plus a branded /pricing coming-soon stub preventing 404**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-07T18:16:34Z
- **Completed:** 2026-03-07T18:18:09Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Created `/download` page matching Download.png exactly: hero with "Gatherly in your pocket" heading, App Store + Google Play buttons (default state, href="#"), shield trust badge, inline phone mockup, 3-column mobile-first feature grid, and dark teal CTA section
- Created `/pricing` stub returning 200 with branded coming-soon content — prevents the nav Pricing link from 404ing
- Both pages are pure server components with metadata exports; TypeScript compiles clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Download page matching Download.png** - `47e3364` (feat)
2. **Task 2: Pricing stub page** - `92d19a7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/download/page.tsx` - Full download page: hero, app store buttons, phone mockup, features grid, teal CTA
- `apps/web/app/pricing/page.tsx` - Coming-soon stub with Sparkles icon, badge, heading, back-to-home button

## Decisions Made

- PLAY_INSTALLED badge in the Download.png template is a mockup design artifact — no app-installation detection logic implemented (JS cannot reliably detect app installation); both buttons use href="#" since app is not yet published
- Phone mockup built entirely from Tailwind classes (dark rounded container + event cards) — avoids an image asset and remains easily editable
- Pricing page kept intentionally minimal — no structural decisions made that would constrain future real pricing page design

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first attempt. No missing dependencies.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /download and /pricing routes are live and styled
- Both pages render within the persistent Nav + Footer root layout
- TypeScript clean; ready for any subsequent phase that links to these routes
- Pricing stub can be replaced with real pricing content independently of other work

---
*Phase: 21-nextjs-website*
*Completed: 2026-03-07*
