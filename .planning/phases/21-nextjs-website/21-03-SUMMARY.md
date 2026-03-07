---
phase: 21-nextjs-website
plan: 03
subsystem: ui
tags: [nextjs, tailwind, react, typescript, marketing, server-components]

# Dependency graph
requires:
  - phase: 21-nextjs-website
    plan: 01
    provides: Next.js 15 root layout, Tailwind v4 brand tokens, Nav + Footer, apps/web scaffold

provides:
  - Features page at /features (dark teal hero, 3 alternating feature sections, bordered CTA)
  - How it Works page at /how-it-works (white hero, 3 step cards, dark Modular section, CTA)

affects:
  - 21-02 (home page — sibling page in same web app)
  - 21-04 (magic link redirect — sibling route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure server component pages (no 'use client') for static marketing content
    - Alternating layout pattern using isImageLeft boolean per feature item
    - Placeholder div pattern for TODO image assets with rounded-2xl + aspect ratio

key-files:
  created:
    - apps/web/app/features/page.tsx
    - apps/web/app/how-it-works/page.tsx
  modified: []

key-decisions:
  - "Placeholder divs for images: rounded-2xl bg-gray-100 with aspect-[4/3] and TODO comment — avoids broken img tags before real assets exist"
  - "No 'use client' on either page — both are pure content, server rendering is correct"
  - "brand-500/10 for icon badge background — Tailwind v4 opacity modifier works correctly with CSS custom property tokens"

patterns-established:
  - "Alternating feature section pattern: array of { imageLeft: boolean } drives flex order without conditional classNames per section"
  - "Dark section pattern: bg-brand-800 with text-white body, text-brand-400 for secondary text"

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 21 Plan 03: Features page + How it Works page Summary

**Two full marketing pages — /features (dark hero + 3 alternating feature rows + bordered CTA) and /how-it-works (split hero + 3 step cards + dark Modular section + CTA) — both server-rendered with Tailwind v4 brand tokens**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-07T18:16:26Z
- **Completed:** 2026-03-07T18:17:52Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Built `/features` page matching Features.png: dark teal hero with italic "unforgettable" in brand-400, three alternating two-column sections (Gift Exchange, Potluck Planner, Photo Memories) each with icon badge + bullets, and a bordered CTA box
- Built `/how-it-works` page matching HowItWorks.png: split hero with teal "3 easy steps" highlight and dual CTAs, three numbered step cards on gray-50, dark brand-800 Modular by Design section with check list, and white CTA footer
- Both pages pass TypeScript check with zero errors and are pure server components

## Task Commits

Each task was committed atomically:

1. **Task 1: Features page matching Features.png** - `b171cf4` (feat)
2. **Task 2: How it Works page matching HowItWorks.png** - `fcb2ed2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/features/page.tsx` - Features marketing page with dark hero, alternating sections, bordered CTA
- `apps/web/app/how-it-works/page.tsx` - How it Works page with white hero, step cards, dark modular section, CTA

## Decisions Made

- Placeholder divs for images use `rounded-2xl bg-gray-100 aspect-[4/3]` with TODO comments — avoids broken `<img>` tags before real screenshot assets exist
- No `'use client'` directive on either page — both are pure static content, server rendering is correct and optimal
- `bg-brand-500/10` opacity modifier for icon badge backgrounds — Tailwind v4 opacity modifiers work with CSS custom property color tokens via the `@theme` block

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript check passed cleanly on first run for both pages.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/features` and `/how-it-works` routes are live and match their design templates
- Both pages are wrapped automatically by the root layout's Nav + Footer (from plan 21-01)
- Image placeholders can be swapped for real assets without structural changes
- Ready for plan 21-02 (home page) and plan 21-04 (magic link redirect)

---
*Phase: 21-nextjs-website*
*Completed: 2026-03-07*
