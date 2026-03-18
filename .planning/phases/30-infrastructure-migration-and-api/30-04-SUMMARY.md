---
phase: 30-infrastructure-migration-and-api
plan: "04"
subsystem: api
tags: [express, postgresql, potluck, modules, transactions, race-guard]

# Dependency graph
requires:
  - phase: 30-01
    provides: "014-phase30-v22.sql migration — module_potluck_categories and module_potluck_signups tables"
provides:
  - "GET/POST/PUT/DELETE /api/events/:id/potluck/categories — organizer category management"
  - "GET/POST/DELETE /api/events/:id/potluck/signups — member signup management with race guard"
affects: [32-potluck-screens, 33-potluck-screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SELECT FOR UPDATE in transaction to prevent double-booking a potluck slot"
    - "Catch pg error code 23505 for unique constraint → 409 slot_taken"
    - "asyncHandler() wrapping on every route handler (enforced project-wide)"

key-files:
  created: []
  modified:
    - apps/api/src/routes/modules.ts

key-decisions:
  - "participantName sent from client body — both organizer and participant tokens are valid for signup; no server-side name resolution needed"
  - "slot_taken is returned for both full-slot (count >= quantity) and duplicate-participant (23505) cases — single error code for client simplicity"
  - "PUT category uses dynamic SET clause (patch-style) — same pattern as existing routes in codebase"

patterns-established:
  - "Race guard pattern: BEGIN → SELECT FOR UPDATE → COUNT check → INSERT → COMMIT — use for any slot/seat booking endpoint"

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 30 Plan 04: Potluck API Routes Summary

**Potluck category CRUD and slot-signup endpoints with SELECT FOR UPDATE race guard, returning 409 `slot_taken` on overflow or duplicate participant**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-18T11:38:06Z
- **Completed:** 2026-03-18T11:46:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added 4 category management routes (GET/POST/PUT/DELETE) with organizer-only write access
- Added 3 signup routes (GET/POST/DELETE) accessible by both organizer and participant tokens
- Implemented SELECT FOR UPDATE transaction race guard: simultaneous requests for the last slot both get 409 `{error:'slot_taken'}` rather than one succeeding silently
- Unique constraint (category_id, participant_name) also maps to 409 `slot_taken` via pg error code 23505 catch

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Potluck category CRUD and signup routes** - `6ecb4fc` (feat)

**Plan metadata:** pending (docs commit below)

## Files Created/Modified

- `apps/api/src/routes/modules.ts` - Added `// --- POTLUCK MODULE ---` block with 7 new route handlers (288 lines)

## Decisions Made

- `participantName` sourced from request body for both organizer and participant tokens — the mobile client always sends it; no server-side lookup needed, keeping the route simple
- Both "full slot" (count >= quantity) and "duplicate signup" (pg 23505) map to the same `{error:'slot_taken'}` response — client only needs to handle one error shape
- Category PUT uses dynamic SET clause (patch-style partial updates) consistent with existing routes in the codebase

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Potluck API is complete and ready for Phase 32 (Potluck module screens) to build against
- Free-tier enforcement is handled upstream in PUT /:id/modules (plan-tier check) — potluck category/signup routes themselves do not re-check plan_tier (consistent with polls/rsvp routes)
- No blockers

---
*Phase: 30-infrastructure-migration-and-api*
*Completed: 2026-03-18*
