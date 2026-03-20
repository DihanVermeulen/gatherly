---
phase: 29-phase-27-still-is-not-working
plan: "03"
subsystem: ui
tags: [react-native, expo-router, gluestack, magic-link, auth, participant]

# Dependency graph
requires:
  - phase: 27-smart-invite-join
    provides: participantId field on session user object for magic-link-only participants
  - phase: 29-phase-27-still-is-not-working
    provides: 29-01 lookup endpoint + join.tsx fixes establishing participantId contract
provides:
  - Login/register upgrade banner on event-details screen for participant-only sessions
affects:
  - phase-28-remove-account-roles
  - future participant upgrade flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "participant-only detection via user?.participantId !== undefined (undefined = full account, set = magic-link only)"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/event-details.tsx

key-decisions:
  - "Banner placed after hero block, before px-4 mt-4 content area — maximally visible on screen arrival"
  - "user?.participantId !== undefined as the detection condition — full-account users never have participantId set"
  - "Navigation to /register via router.push as never — consistent with existing navigation patterns in codebase"

patterns-established:
  - "participantId-gate pattern: user?.participantId !== undefined gates UI features exclusive to magic-link-only sessions"

# Metrics
duration: 1min
completed: 2026-03-13
---

# Phase 29 Plan 03: Event-Details Login/Register Banner Summary

**Teal upgrade banner on event-details screen shown only to participant-only (magic-link) sessions, with Sign Up CTA navigating to /register**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-13T15:33:57Z
- **Completed:** 2026-03-13T15:34:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added conditional "Create an account" banner to event-details screen visible only when `user?.participantId !== undefined`
- Banner uses teal-50 background matching existing app palette, with Sign Up button in teal-600
- Tapping Sign Up navigates to /register screen via `router.push("/register" as never)`
- Full-account users (participantId undefined) see no banner — zero impact on existing UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Add login/register banner to event-details for participant-only sessions** - `6570f8a` (feat)

## Files Created/Modified
- `apps/gatherly-mobile/app/event-details.tsx` - Added participant-only upgrade banner between hero block and main content area

## Decisions Made
- Banner placed immediately after hero block (before scrollable content) to ensure high visibility on screen load
- Detection condition `user?.participantId !== undefined` — matches STATE.md contract where full-account users have no participantId
- Used inline `style={{ backgroundColor: '#f0fdfa' }}` (teal-50) for dynamic color — consistent with existing pattern in this file (heroColor, Secret Assignment card)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Participant-only users now have a visible path to upgrade from within the event-details screen
- Both 29-02 (magic-link screen two-option UI) and 29-03 (event-details banner) are complete as wave 2
- Phase 29 gap closure for Phase 27 Smart Invite Join is fully addressed across all three plans

---
*Phase: 29-phase-27-still-is-not-working*
*Completed: 2026-03-13*
