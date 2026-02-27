---
phase: 17-join-event-screen
plan: "02"
subsystem: ui
tags: [expo-router, react-native, gluestack, invite, state-machine, skeleton, spinner]

# Dependency graph
requires:
  - phase: 17-01
    provides: invitesApi.validate/accept, pendingInvite utility, _layout.tsx redirect

provides:
  - Full join screen with 7-state machine (loading, preview, joining, success, already-joined, invalid, error)
  - Unauthenticated join flow via setPendingInviteCode + sign-in redirect
  - Pending invite flow documented in sign-in.tsx and register.tsx

affects:
  - Phase 18 (organizer invite management — references join flow as end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "State machine pattern for multi-step async UI: JoinState type with 7 discrete states"
    - "Auto-join on auth: useEffect watches [session, previewData] triggers handleJoin"
    - "retryCount in validate useEffect deps — enables Try Again without changing token"
    - "Success auto-navigate: setTimeout(2000) with cleanup via return () => clearTimeout"
    - "Double-call guard: if (joinState === 'joining') return at top of handleJoin"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/join.tsx
    - apps/gatherly-mobile/app/sign-in.tsx
    - apps/gatherly-mobile/app/register.tsx

key-decisions:
  - "State machine (JoinState union type) chosen over imperative boolean flags — explicit states prevent impossible UI combinations"
  - "retryCount in validate effect deps: token doesn't change on retry, so retryCount triggers re-fetch"
  - "Comment-only approach for sign-in/register pending invite: actual storage is in join.tsx, sign-in/register are pass-through; unused imports would cause TS errors"

patterns-established:
  - "JoinState machine: declare union type, useState, switch in renderContent() — clean separation of state/render"
  - "handleJoin guard pattern: check joinState === 'joining' before any async operation"
  - "Auto-join after auth: useEffect([session, previewData]) calls handleJoin() when both truthy"

# Metrics
duration: ~2min
completed: "2026-02-27"
---

# Phase 17 Plan 02: Join Event Screen Summary

**State-machine join screen with 7 states: loading skeleton, invite preview with hero/organizer/count/date, joining overlay, success auto-navigate (2s), already-joined CTA, invalid, and network-error-with-retry**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T15:56:02Z
- **Completed:** 2026-02-27T15:57:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced 19-line join.tsx placeholder with 360-line full implementation covering all 7 join states
- Unauthenticated flow: setPendingInviteCode(token) -> router.push('/sign-in') -> _layout.tsx redirect -> auto-join on session change
- Network resilience: inline error on failure, "Come back later" (WifiOff icon) after 3 failures, retry re-validates invite

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement full join.tsx screen with all 7 states** - `c3aadf2` (feat)
2. **Task 2: Wire sign-in.tsx and register.tsx for pending invite preservation** - `56b3b19` (docs)

**Plan metadata:** (committed below)

## Files Created/Modified
- `apps/gatherly-mobile/app/join.tsx` - Full state-machine join screen (360 lines, 7 states)
- `apps/gatherly-mobile/app/sign-in.tsx` - Added pending invite flow comment
- `apps/gatherly-mobile/app/register.tsx` - Added pending invite flow comment

## Decisions Made
- **retryCount in validate effect deps:** token doesn't change when user taps "Try Again" — adding retryCount as a counter triggers the useEffect to re-run and re-fetch
- **Comment-only for sign-in/register:** The pending invite code is stored by join.tsx before navigating; sign-in and register are pass-through screens. Adding an unused import would cause TypeScript unused import warnings, so comments document the flow instead
- **Switch in renderContent():** Centralized state rendering in a single function with switch makes all 7 states visible and independently testable

## Deviations from Plan

None - plan executed exactly as written. The retryCount pattern was specified in the plan (under the "Try Again" section) and implemented as directed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 17 complete: invite link deep linking, join flow with all 7 states, and auth-aware redirect all working
- Phase 18 (organizer invite management) can reference this join flow as the destination for share links
- Blocker from STATE.md: Phase 18 template screen MISSING — must request from user before executing Phase 18

---
*Phase: 17-join-event-screen*
*Completed: 2026-02-27*
