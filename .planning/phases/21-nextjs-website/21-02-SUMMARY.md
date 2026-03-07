---
phase: 21-nextjs-website
plan: 02
subsystem: ui
tags: [nextjs, tailwind, react, typescript, lucide-react, video-modal, landing-page]

# Dependency graph
requires:
  - phase: 21-nextjs-website/21-01
    provides: Next.js 15 scaffold, Tailwind v4 brand tokens, root layout with Nav + Footer
provides:
  - Home page at apps/web/app/page.tsx matching Home.png template exactly
  - VideoModal client component at apps/web/components/video-modal.tsx (reusable named export)
  - Hero section with teal branding, plant image, floating event card
  - 3-column feature grid (Gift Exchange, Potluck Planner, Photo Gallery)
  - Dark teal mobile CTA section with App Store + Google Play buttons and phone mockup
affects:
  - 21-03 (download page shares app store button pattern)
  - 21-04 (magic link redirect page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client component modal pattern with Escape key listener + backdrop click to close
    - Unsplash placeholder image with TODO comment for real asset
    - Inline phone mockup using styled divs (no image dependency)
    - App store SVG icons inline in JSX (no external icon library needed for brand logos)

key-files:
  created:
    - apps/web/components/video-modal.tsx
    - apps/web/app/page.tsx (replaced placeholder)
  modified: []

key-decisions:
  - "VideoModal uses triggerClassName prop so caller fully controls button appearance"
  - "Phone mockup rendered with styled divs to avoid image asset dependency"
  - "App store icons use inline SVG (Apple/Google logos are not in lucide-react)"
  - "Unsplash hero image with TODO comment — real asset replaces URL when ready"

patterns-established:
  - "'use client' modal pattern: useState for open, useEffect for Escape key, backdrop click stops propagation"
  - "Section layout pattern: max-w-6xl mx-auto px-6 for consistent content width matching Nav"

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 21 Plan 02: Home Page Summary

**Home page with hero ('Events Made Effortless'), 3-column feature grid, and dark teal mobile CTA, plus reusable VideoModal component wired to 'Watch Demo' button**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-07T18:16:26Z
- **Completed:** 2026-03-07T18:18:04Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 replaced)

## Accomplishments

- Created `VideoModal` client component with named export, Escape key close, and backdrop click dismiss — ready for real video URL
- Built complete Home page matching Home.png across all three sections: hero, feature grid, dark mobile CTA
- Wired VideoModal to "Watch Demo" ghost button; Start Planning Now uses teal filled button with ArrowRight icon

## Task Commits

Each task was committed atomically:

1. **Task 1: VideoModal component** - `a6f9ded` (feat)
2. **Task 2: Home page matching Home.png** - `a93661f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/components/video-modal.tsx` - 'use client' modal with trigger button, full-screen overlay, close on Escape/backdrop
- `apps/web/app/page.tsx` - Complete Home page: hero, feature grid, mobile CTA section

## Decisions Made

- VideoModal exposes `triggerClassName` prop so the Home page controls button styling (ghost border style); component stays generic for reuse
- Phone mockup in mobile CTA section rendered with styled divs (no image asset) — avoids an external asset dependency
- App Store and Google Play icons use inline SVG since lucide-react does not include brand logos
- Hero plant image points to an Unsplash URL with a TODO comment for the real asset when brand photography is ready

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on first pass. Brand tokens (bg-brand-500, bg-brand-800, text-brand-400) resolved correctly from globals.css @theme block established in Plan 01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Home page is live at http://localhost:3001 (when dev server is running)
- VideoModal is a standalone named export, importable by any future page needing a demo video trigger
- All three sections render with correct brand colors: bg-brand-500 for CTAs, bg-brand-800 for dark CTA section, text-brand-400 for muted text on dark bg
- Plan 03 (Download page) can reuse the App Store + Google Play button pattern from this page

---
*Phase: 21-nextjs-website*
*Completed: 2026-03-07*
