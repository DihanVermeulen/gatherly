---
phase: 35-paywall-components
plan: 01
subsystem: ui
tags: [react-native, expo, paywall, upgrade, gluestack, lucide, expo-web-browser, amber]

# Dependency graph
requires:
  - phase: 34-infrastructure
    provides: planTier free/premium type model, participant_cap/trial_limit error codes, plansApi PATCH /upgrade endpoint

provides:
  - PaywallBanner shared inline-card component with contextual headlines and amber/gold styling
  - plansApi.upgrade() wrapping PATCH /api/events/:id/upgrade
  - UPGRADE_REQUEST_URL single-source constant for external upgrade form
  - pricing screen route registered in authenticated Stack.Protected block

affects: [36-paywall-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PaywallFeature discriminated union: string literals + { type, moduleName } object"
    - "Inline hex styles for non-brand colors (amber) to avoid NativeWind purge issues"
    - "Pressable + native Text for CTA button when custom inline colors needed over GlueStack Button"
    - "Alert.alert -> WebBrowser.openBrowserAsync for external URL CTA pattern"

key-files:
  created:
    - apps/gatherly-mobile/constants/upgrades.ts
    - apps/gatherly-mobile/app/api/plans.ts
    - apps/gatherly-mobile/components/PaywallBanner.tsx
  modified:
    - apps/gatherly-mobile/app/_layout.tsx

key-decisions:
  - "PaywallBanner uses Pressable + native Text (not GlueStack Button) for CTA to guarantee inline amber styles render correctly"
  - "eventId prop is optional and intentionally unused in Phase 35 CTA flow — it exists as a Phase 36 routing hook"
  - "UPGRADE_REQUEST_URL placeholder value — must be replaced with real Typeform slug before launch"

patterns-established:
  - "PaywallBanner: always inline amber card, never modal/bottom-sheet, never dismissable"
  - "isParticipant=true -> read-only 'Ask your organiser' copy, no CTA rendered"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 35 Plan 01: Paywall Components — Primitives Summary

**Shared PaywallBanner card component with amber styling, plansApi PATCH wrapper, UPGRADE_REQUEST_URL constant, and pricing route registration establishing all canonical upgrade UX primitives for Phase 36 wiring.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T11:48:46Z
- **Completed:** 2026-03-28T11:50:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `constants/upgrades.ts` with `UPGRADE_REQUEST_URL` as the single source of truth for the external upgrade form URL
- Created `app/api/plans.ts` with `plansApi.upgrade(eventId)` wrapping `PATCH /api/events/:id/upgrade`
- Created `components/PaywallBanner.tsx` — amber/gold inline card with 5 contextual headlines, organiser CTA (Alert confirmation -> WebBrowser external URL), participant read-only variant, Lock icon from lucide-react-native
- Registered `pricing` screen route in `_layout.tsx` under authenticated `Stack.Protected` block with `headerShown: false`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create constants, plansApi client, and PaywallBanner component** - `82b28ed` (feat)
2. **Task 2: Register pricing screen route in _layout.tsx** - `5fb3bf7` (feat)

## Files Created/Modified

- `apps/gatherly-mobile/constants/upgrades.ts` — `UPGRADE_REQUEST_URL` constant (placeholder, replace before launch)
- `apps/gatherly-mobile/app/api/plans.ts` — `plansApi` object with `upgrade(eventId)` method
- `apps/gatherly-mobile/components/PaywallBanner.tsx` — shared paywall banner; exports `PaywallBanner` + `PaywallFeature` type
- `apps/gatherly-mobile/app/_layout.tsx` — added `pricing` screen in authenticated Stack.Protected block

## Decisions Made

- Used `Pressable` + native `Text` for the CTA button (not GlueStack `Button`/`ButtonText`) because the amber hex colors live entirely in inline styles; GlueStack Button renders via NativeWind class variants which would conflict with custom color overrides.
- `eventId` prop is typed `string | undefined` and prefixed `_eventId` in destructuring — intentionally unused in Phase 35 (opens external URL directly), available for Phase 36 routing context.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in GlueStack UI library components (`components/ui/bottomsheet` and `components/ui/table`) were present before this plan and are not caused by any new code. New files compile cleanly.

## User Setup Required

None — no external service configuration required for this plan. Note: `UPGRADE_REQUEST_URL` in `constants/upgrades.ts` contains a placeholder value — must be replaced with the real Typeform/Tally slug before launch.

## Next Phase Readiness

- All upgrade UX primitives in place for Phase 36 wiring
- `PaywallBanner` ready to be imported into any locked screen with `feature` + `isParticipant` props
- `pricing` route registered; Plan 35-02 creates `app/pricing.tsx`
- No blockers

---
*Phase: 35-paywall-components*
*Completed: 2026-03-28*
