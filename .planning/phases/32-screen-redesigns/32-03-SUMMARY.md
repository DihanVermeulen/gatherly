---
phase: 32-screen-redesigns
plan: 03
subsystem: ui
tags: [react-native, expo, events-api, cover-photo, organizer-name, local-state]

# Dependency graph
requires:
  - phase: 32-01
    provides: "GET /api/events/:id returns organizerName from users table lookup"
  - phase: 32-02
    provides: "edit-event.tsx Event Details card with cover photo thumbnail slot"
provides:
  - "event-details.tsx fetches coverPhotoUrl + organizerName from getById on mount"
  - "edit-event.tsx fetches coverPhotoUrl from getById on mount"
  - "Hero Image, organized-by line, and manage-event thumbnail all render actual data"
affects: ["33-potluck-screens", "future screens reading detail fields from event context"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getById-on-mount: screens that need detail fields (coverPhotoUrl, organizerName) call eventsApi.getById(id) in a useEffect and store results in local state — list endpoint does not carry these fields"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/app/edit-event.tsx

key-decisions:
  - "Local state for detail fields — do not attempt to backfill EventsContext getAll() with full detail; fetch on demand per screen"

patterns-established:
  - "getById-on-mount pattern: add local useState for each detail field, call eventsApi.getById(id).then().catch(() => {}) in useEffect([id]), read local state in render — never read detail fields from EventsContext TEvent"

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 32 Plan 03: Gap Closure — coverPhotoUrl + organizerName Wiring Summary

**eventsApi.getById called on mount in event-details.tsx and edit-event.tsx so hero photo, organized-by line, and manage-event thumbnail render actual data instead of always being undefined**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-22T04:46:55Z
- **Completed:** 2026-03-22T04:48:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- event-details.tsx now fetches `coverPhotoUrl` and `organizerName` from `eventsApi.getById(id)` on mount and stores them in local state; hero Image branch and organized-by line both use local state
- edit-event.tsx now fetches `coverPhotoUrl` from `eventsApi.getById(id)` on mount; Event Details card thumbnail uses local state instead of `event.coverPhotoUrl` from context
- Closed all three verification gaps from 32-VERIFICATION.md in one plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire event-details.tsx to fetch detail fields on mount** - `cbb9648` (feat)
2. **Task 2: Wire edit-event.tsx to fetch coverPhotoUrl on mount** - `f498e85` (feat)

## Files Created/Modified
- `apps/gatherly-mobile/app/event-details.tsx` - Added eventsApi import, detailCoverPhotoUrl + detailOrganizerName local state, getById useEffect; hero and organized-by line read from local state
- `apps/gatherly-mobile/app/edit-event.tsx` - Added detailCoverPhotoUrl local state, getById useEffect; Event Details card thumbnail reads from local state

## Decisions Made
- Local state per screen rather than updating EventsContext — the list endpoint (GET /api/events) intentionally omits heavy fields like coverPhotoUrl; fetching detail on demand is the correct pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — eventsApi was already imported in edit-event.tsx. In event-details.tsx it was not imported yet (only TEventModule was imported from that module), so the import line was updated to add the named export alongside TEventModule.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three 32-VERIFICATION.md gaps are now closed
- Phase 32 screen redesigns ready for final verification pass
- Phase 33 Potluck Screens can proceed

---
*Phase: 32-screen-redesigns*
*Completed: 2026-03-22*
