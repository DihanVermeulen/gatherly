---
phase: 36-paywall-wiring
plan: 02
subsystem: ui
tags: [react-native, paywall, tier-limits, potluck, polls, participants]

# Dependency graph
requires:
  - phase: 36-01
    provides: PaywallModal component at @/components/PaywallModal
provides:
  - Potluck Setup with category counter (X of 3) and PaywallModal cap enforcement at 3 categories
  - Edit Event with participant badge (X/20) visible at 15+ and PaywallModal cap at 20
  - Polls screen with always-visible poll counter (X of 1) for free-tier organizers and PaywallModal at 1-poll cap
affects: [future paywall wiring, any screen adding tier-limited features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Counter banner pattern: amber-50/amber-900 View visible at N-1 threshold, always visible (polls) or threshold-gated (categories)"
    - "Cap enforcement pattern: guard at action handler (handleAddCategory) and button onPress conditional"
    - "isFree derivation: (event?.planTier ?? 'free') === 'free' — defensive default to free if event not loaded"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/potluck-setup.tsx
    - apps/gatherly-mobile/app/edit-event.tsx
    - apps/gatherly-mobile/app/polls.tsx

key-decisions:
  - "Potluck Setup: full-screen free-tier gate removed — free organizers see normal setup screen with soft counter"
  - "Category counter visible at 2+ categories (not 3) so user sees warning before hitting the cap"
  - "Participant badge visible at 15+ so user has warning before reaching the 20-participant cap"
  - "Polls counter always visible for free-tier organizers (regardless of poll count) per plan spec"
  - "Cap guard in handleAddCategory (not just button) — prevents programmatic bypasses"

patterns-established:
  - "Amber counter row: backgroundColor #fffbeb, borderRadius 10, paddingHorizontal 12, paddingVertical 8 — reuse this style for all tier limit counters"
  - "onPress cap pattern: isFree && resource.length >= CAP ? () => setShowPaywall(true) : handleNormalAction"

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 36 Plan 02: Paywall Wiring (Screens) Summary

**Potluck Setup, Edit Event, and Polls wired with amber tier counters and PaywallModal cap enforcement, completing paywall wiring across all limited screens**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T00:00:00Z
- **Completed:** 2026-03-28T00:02:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Removed full-screen free-tier gate from Potluck Setup — free organizers now see the normal setup screen with a soft amber counter
- Edit Event shows "X/20 participants" badge at 15+ participants on free events; invite button routes to PaywallModal at the 20-participant cap
- Polls screen shows "X of 1 polls used" counter always for free-tier organizers; + button opens PaywallModal when 1 poll already exists

## Task Commits

Each task was committed atomically:

1. **Task 1: Potluck Setup — remove gate, add counter + PaywallModal** - `ba6e5b4` (feat)
2. **Task 2: Edit Event participant badge + Polls counter + PaywallModal** - `4cb5ce1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/gatherly-mobile/app/potluck-setup.tsx` - Gate removed; category counter + PaywallModal added
- `apps/gatherly-mobile/app/edit-event.tsx` - PARTICIPANT_CAP constant, isFree derivation, participant badge, invite button cap enforcement, PaywallModal
- `apps/gatherly-mobile/app/polls.tsx` - useEvents import for isFree, poll counter, + button cap enforcement, PaywallModal

## Decisions Made
- Category counter shows at 2+ categories (not 3) so the warning appears before the cap is hit
- Participant badge threshold is 15 (not 20) to give advance warning
- Polls counter is always visible on free tier regardless of poll count — emphasises the limit is in place from the start
- isFree guard added inside handleAddCategory as well as the button onPress — belt-and-suspenders approach

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `components/ui/bottomsheet/index.tsx` and `components/ui/table/index.tsx` are unrelated to this plan and were present before execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three remaining screens (Potluck Setup, Edit Event, Polls) now use the shared PaywallModal pattern
- Phase 36 paywall wiring is complete — all feature-limited screens show consistent tier UX
- Phase 37 can proceed (paywall integration / backend upgrade flow)

---
*Phase: 36-paywall-wiring*
*Completed: 2026-03-28*
