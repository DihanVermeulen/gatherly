---
phase: 21-nextjs-website
plan: 05
subsystem: ui
tags: [nextjs, deep-link, universal-links, app-links, intent, react, typescript, magic-link]

# Dependency graph
requires:
  - phase: 21-nextjs-website
    provides: Next.js 15 App Router scaffold with Tailwind v4 brand tokens, Nav, Footer, root layout (plan 01)
provides:
  - /magic-link/[token] route as standalone client component with deep link redirect logic
  - Layout override at apps/web/app/magic-link/layout.tsx suppressing Nav/Footer
  - Loading state (logo + spinner + "Opening the app...")
  - Not-installed fallback state (App Store + Google Play buttons + intent:// anchor)
affects:
  - Future plans needing to reference magic link UX flow
  - App store listing plans (href="#" placeholders need real store URLs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Next.js App Router nested layout override — magic-link/layout.tsx replaces root layout for /magic-link/* only
    - Two-timer deep link pattern — 300ms intent:// attempt + 2000ms not-installed state switch
    - Next.js 15 async params — use(params) required; synchronous access is deprecated
    - intent:// URL scheme for older Android Chrome — includes package, scheme, and browser_fallback_url
    - Visible anchor as reliable Android fallback — Chrome blocks intent:// from timers, click-gesture required

key-files:
  created:
    - apps/web/app/magic-link/layout.tsx
    - apps/web/app/magic-link/[token]/page.tsx
  modified: []

key-decisions:
  - "Layout override pattern: magic-link/layout.tsx returns only {children} — overrides root Nav+Footer for all /magic-link/* routes"
  - "Two-timer pattern: 300ms intentTimer for older Android + 2000ms fallbackTimer to switch to not_installed state"
  - "intent:// URL uses package=com.gatherly.gatherly with S.browser_fallback_url encoding current URL"
  - "Visible <a href={intentUrl}> anchor kept in not-installed state as reliable click-gesture fallback for Android Chrome"
  - "App store hrefs are placeholder '#' — require real store URLs before production deploy"

patterns-established:
  - "Next.js layout override pattern: create layout.tsx in route segment to suppress parent Nav/Footer"
  - "Deep link two-timer: short timer attempts programmatic redirect, long timer switches UI state"

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 21 Plan 05: Magic Link Redirect Page Summary

**Standalone /magic-link/[token] client component with two-timer intent:// deep link logic, branded loading state, and not-installed fallback with App Store/Google Play buttons**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-07T18:17:01Z
- **Completed:** 2026-03-07T18:18:18Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Created layout override at `apps/web/app/magic-link/layout.tsx` that suppresses Nav and Footer for all `/magic-link/*` routes
- Built `apps/web/app/magic-link/[token]/page.tsx` as a `'use client'` component with Next.js 15 async params via `use(params)`
- Implemented two-timer deep link strategy: 300ms `intent://` attempt for older Android Chrome + 2000ms fallback to not-installed UI state with App Store/Google Play download buttons and a visible click-based intent anchor

## Task Commits

Each task was committed atomically:

1. **Task 1: Magic link layout override (no Nav/Footer)** - `0e427ae` (feat)
2. **Task 2: Magic link redirect page with deep link logic** - `ff788f8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/app/magic-link/layout.tsx` - Layout override; renders only children with no Nav or Footer
- `apps/web/app/magic-link/[token]/page.tsx` - Client component with loading + not-installed states, intent:// URL construction, two-timer pattern

## Decisions Made

- Layout override pattern: `magic-link/layout.tsx` returns `<>{children}</>` — Next.js nested layout override suppresses root Nav+Footer for all `/magic-link/*` routes without touching root layout
- Two-timer pattern: 300ms `intentTimer` fires `window.location.href = intentUrl` for older Android Chrome; 2000ms `fallbackTimer` calls `setState('not_installed')` if user is still on page
- `intent://` URL built as `intent://magic-link/${token}#Intent;scheme=https;package=com.gatherly.gatherly;S.browser_fallback_url=...;end` — standard Chrome intent syntax with encoded fallback
- Visible `<a href={intentUrl}>` anchor kept in not-installed state as reliable click-gesture fallback — Chrome blocks `intent://` fired from `setTimeout` without user gesture; anchor click is user-gesture triggered
- App store `href="#"` placeholders — real App Store and Google Play URLs needed before production

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compile clean on first attempt, no dependency changes needed.

## User Setup Required

None - no external service configuration required. However, before production deployment, App Store and Google Play URLs in `page.tsx` must be updated from `href="#"` to real store listing URLs.

## Next Phase Readiness

- `/magic-link/[token]` route is fully functional as a client component
- No Nav/Footer appears on magic link routes
- Loading and not-installed states render correctly
- TypeScript clean
- App store button `href="#"` values need replacing with real store URLs at publish time
- iOS Universal Links and Android App Links (AASA + assetlinks.json from plan 21-01) handle the primary redirect path — this page is the fallback for when OS interception fails or app is not installed

---
*Phase: 21-nextjs-website*
*Completed: 2026-03-07*
