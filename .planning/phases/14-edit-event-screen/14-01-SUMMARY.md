---
phase: 14-edit-event-screen
plan: 01
subsystem: ui
tags: [react-native, expo-router, gluestack, api-client, exclusions, couples]

# Dependency graph
requires:
  - phase: 13-events-list-+-details-screens
    provides: EventsContext with state/refreshEvents, event-details.tsx pattern for GlueStack + Expo Router screens
  - phase: 12-api-integration
    provides: apiClient pattern, eventsApi.update for persisting couples via PUT /api/events/:id
provides:
  - Invites API module (invitesApi with create/list/delete) ready for Plan 02 invite modal
  - Manage Exclusions screen with tap-to-select-pair UI and couples persistence
  - manage-exclusions route registered in root Stack navigator
  - react-qr-code installed and available
affects:
  - 14-02 (edit-event.tsx overhaul depends on invites.ts and manage-exclusions existing)

# Tech tracking
tech-stack:
  added:
    - react-qr-code@2.0.18
  patterns:
    - Invites API module: same .then(r => r.data) pattern as events.ts/gifts.ts/decipher.ts
    - Manage Exclusions: two-step tap pattern for building string[][] couples array
    - Couple save: full-array-replace via eventsApi.update(id, { couples }) — PUT /api/events/:id supports this

key-files:
  created:
    - apps/gatherly-mobile/app/api/invites.ts
    - apps/gatherly-mobile/app/manage-exclusions.tsx
  modified:
    - apps/gatherly-mobile/app/api/index.ts
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/package.json

key-decisions:
  - "PUT /api/events/:id confirmed to accept couples field — deletes all existing couples and re-inserts full array"
  - "Manage Exclusions uses eventsApi.update not direct couples endpoint — simpler, full-array-replace is safe"
  - "Back arrow triggers save (same UX as iOS back-to-save pattern) plus explicit Save button at bottom"

patterns-established:
  - "Exclusions screen: firstSelected state drives two-step pair creation without a modal"
  - "Couples stored as string[][] (names, not IDs) matching TEvent.couples type"

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 14 Plan 01: Edit Event Screen Infrastructure Summary

**react-qr-code installed, invitesApi module created, and Manage Exclusions screen built with tap-to-select-pair couple management and GlueStack UI**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T06:19:35Z
- **Completed:** 2026-02-25T06:21:51Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed react-qr-code@2.0.18 in gatherly-mobile (needed by Plan 02 invite modal)
- Created `app/api/invites.ts` with typed Invite type and invitesApi (create/list/delete), following the exact `.then(r => r.data)` pattern of the existing API modules
- Created `app/manage-exclusions.tsx` (255 lines) — full Manage Exclusions screen with participant chips, tap-to-pair selection, exclusion pair list with delete, and save via eventsApi.update
- Registered `manage-exclusions` route in root `_layout.tsx` inside the authenticated `Stack.Protected` block, after `edit-event`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-qr-code and create invites API module** - `9c49148` (feat)
2. **Task 2: Create Manage Exclusions screen and register route** - `f0040f0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/gatherly-mobile/app/api/invites.ts` — Invite type + invitesApi with create/list/delete
- `apps/gatherly-mobile/app/api/index.ts` — Added re-exports for invitesApi and Invite
- `apps/gatherly-mobile/app/manage-exclusions.tsx` — Manage Exclusions screen (255 lines)
- `apps/gatherly-mobile/app/_layout.tsx` — manage-exclusions Stack.Screen registered
- `apps/gatherly-mobile/package.json` — react-qr-code added as dependency

## Decisions Made
- **PUT /api/events/:id handles couples:** Verified at lines 246-267 of `apps/api/src/routes/events.ts` — the endpoint accepts `couples` array, deletes existing couple rows, then re-inserts. The full-array-replace approach is safe and efficient.
- **Back arrow triggers save:** The back arrow calls `handleSave` (same as the explicit Save button) providing iOS-native UX feel where navigating back commits changes. This matches the expected mental model for settings-style screens.
- **No duplicate pair guard:** Added a duplicate detection check before adding a new pair — pairs are considered identical regardless of order (A,B same as B,A).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (`edit-event.tsx` overhaul) can now import `invitesApi` from `./api/invites`
- Plan 02 can navigate to `manage-exclusions?id=X` via `router.push`
- react-qr-code is ready for use in the invite QR code modal
- PUT /api/events/:id couples handling confirmed — no backend changes needed

---
*Phase: 14-edit-event-screen*
*Completed: 2026-02-25*
