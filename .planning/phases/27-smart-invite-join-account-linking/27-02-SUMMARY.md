---
phase: 27-smart-invite-join-account-linking
plan: "02"
subsystem: auth
tags: [jwt, magic-link, react-native, expo, typescript, dual-response]

# Dependency graph
requires:
  - phase: 27-01
    provides: /redeem endpoint that returns user-scoped JWT when invite email matches users table
provides:
  - Dual-shape redeemMagicLink client handler that correctly maps both user-scoped and participant-scoped API responses to the shared AuthResponse/User interface
  - Clarifying comment in magic-link screen documenting the two possible response shapes
affects: [future-mobile-testing, phase-28, magic-link-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union response detection: 'id' in userData && !('participantId' in userData) distinguishes user-scoped from participant-scoped shape"
    - "Type-safe branching with TypeScript union types for dual API response shapes"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/api/auth.ts
    - apps/gatherly-mobile/app/magic-link/[token].tsx

key-decisions:
  - "Detect user-scoped response via presence of 'id' and absence of 'participantId' — avoids relying on role field which is 'participant' in both shapes"
  - "Inline type assertion for participant-scoped branch after union narrowing — TypeScript cannot narrow discriminated unions with 'in' checks on complex union; cast is safe after detection guard"

patterns-established:
  - "Dual-response API client: use discriminated union type + runtime 'in' detection; each branch returns the canonical AuthResponse shape"

# Metrics
duration: 1min
completed: 2026-03-12
---

# Phase 27 Plan 02: Mobile Dual-Shape Magic Link Handler Summary

**redeemMagicLink updated to branch on user-scoped (existing account) vs participant-scoped (no account) API response, mapping both to the shared AuthResponse/User interface**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-12T07:20:42Z
- **Completed:** 2026-03-12T07:21:18Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Updated `redeemMagicLink` in `auth.ts` to handle both response shapes from Phase 27-01's smart `/redeem` endpoint
- User-scoped path (existing account): maps `id`, `email`, `name`, `role`, `eventId`, `eventName` directly — user gets a full authenticated session
- Participant-scoped path (no account): preserves prior behavior — `participantId` aliased to `id`, empty email, name from `participantName`
- Added discriminant detection guard: `"id" in userData && !("participantId" in userData)` reliably differentiates the two shapes
- Added comment in `[token].tsx` redemption `useEffect` documenting the dual response behaviour

## Task Commits

1. **Task 1: Dual-shape redeemMagicLink + screen comment** - `cfebd09` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `apps/gatherly-mobile/app/api/auth.ts` - redeemMagicLink now branches on response shape; typed with discriminated union; both branches return `AuthResponse`
- `apps/gatherly-mobile/app/magic-link/[token].tsx` - added clarifying comment at top of redemption useEffect; no functional changes

## Decisions Made

- Detection uses `"id" in userData && !("participantId" in userData)` rather than checking `role` — role is `"participant"` in both shapes so is not a reliable discriminant
- Inline `as` cast for participant-scoped branch — after the user-scoped guard TypeScript can't automatically narrow the union further; cast is safe since the guard already excluded the user-scoped shape

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mobile magic-link flow is fully equipped to handle the upgraded API response from Phase 27-01
- Existing user redeeming a magic link will receive a full user session (id, email, name, role, eventId) and be navigated to event details
- No-account user redeeming a magic link continues to receive a participant session — no behavioural change
- The blocker noted in STATE.md ("Mobile app /redeem handler not yet updated") is now resolved

---
*Phase: 27-smart-invite-join-account-linking*
*Completed: 2026-03-12*
