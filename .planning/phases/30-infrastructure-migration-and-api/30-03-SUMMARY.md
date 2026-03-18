---
phase: 30-infrastructure-migration-and-api
plan: 03
subsystem: api
tags: [postgres, express, events, cover-photo, location, api]

# Dependency graph
requires:
  - phase: 30-01
    provides: DB migration 014 with cover_photo/location/allow_guest_invites/is_public columns on events table
provides:
  - Events list endpoint returns hasCoverPhoto boolean (not URL) for each event
  - Events list returns location/allowGuestInvites/isPublic fields
  - Event detail endpoint returns coverPhotoUrl string or null
  - fetchEventById helper includes planTier and all new fields
  - POST /api/events accepts and stores location/coverPhoto/allowGuestInvites/isPublic
  - PUT /api/events/:id accepts location/coverPhoto/allowGuestInvites/isPublic with correct $1-$10 params
affects: [30-04, 32-screen-redesigns, 33-potluck-screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "hasCoverPhoto boolean in list vs coverPhotoUrl string in detail — bandwidth-conscious list/detail split"
    - "Boolean CASE WHEN $N::text IS NOT NULL THEN $N::boolean ELSE col END pattern for nullable booleans in UPDATE"

key-files:
  created: []
  modified:
    - apps/api/src/routes/events.ts

key-decisions:
  - "List returns hasCoverPhoto boolean only — full URL only in detail, matches agreed constraint from STATE.md"
  - "Boolean fields in PUT use String(val) in params with ::text IS NOT NULL check and ::boolean cast in SQL to support optional updates without overwriting"

patterns-established:
  - "fetchEventById is the single source of truth for event shape returned by PUT — update it and all PUT callers get the new fields automatically"

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 30 Plan 03: Events API — Cover Photo and New Fields Summary

**Events endpoints extended with hasCoverPhoto (list), coverPhotoUrl (detail), location, allowGuestInvites, and isPublic across list, detail, create, and update — INFRA-03 and INFRA-04 satisfied**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T11:37:15Z
- **Completed:** 2026-03-18T11:39:12Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Events list query adds `e.cover_photo IS NOT NULL AS has_cover_photo` plus `e.location`, `e.allow_guest_invites`, `e.is_public` — mapped to camelCase response with no URL leak
- Event detail and `fetchEventById` helper now return `coverPhotoUrl`, `location`, `allowGuestInvites`, `isPublic`, and `planTier` (planTier was previously missing from helper)
- POST create and PUT update both accept the four new fields; PUT uses correct `$1`-`$9` SET params with `$10` as `WHERE id`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hasCoverPhoto to events list and new fields to detail** - `9fc9afe` (feat)
2. **Task 2: Accept new fields in event create and update** - `8c774da` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `apps/api/src/routes/events.ts` - Extended list SELECT, list response mapping, detail response, fetchEventById helper, POST create, and PUT update

## Decisions Made

- List returns `hasCoverPhoto: boolean` only — the full `coverPhotoUrl` is omitted from list to keep list payloads lean, consistent with the existing decision in STATE.md
- PUT boolean fields passed as `String(val)` in params array (becomes `"true"`/`"false"`) and tested with `$N::text IS NOT NULL`, then cast with `$N::boolean` in SQL — this allows any subset of fields to be updated without accidentally nullifying existing values

## Deviations from Plan

None — plan executed exactly as written. One additional field (`planTier`) was added to `fetchEventById` as it was noted in the task spec as missing; this was within the task scope.

## Issues Encountered

`pnpm build` in the API failed due to a pre-existing environment issue — `tsdown` uses Rust-native `.node` binaries (`@oxc-transform`, `@oxc-parser`, `@oxc-resolver`) that cannot load in the bash shell on Windows. This is not a code issue. `npx tsc --noEmit` confirmed the TypeScript compiles cleanly with zero errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All new event columns (cover_photo, location, allow_guest_invites, is_public) are readable and writable via the API
- Phase 33 screen redesigns can now call `hasCoverPhoto` from the events list and `coverPhotoUrl` from the event detail
- Ready for 30-04 (mobile API client updates to consume the new fields)

---
*Phase: 30-infrastructure-migration-and-api*
*Completed: 2026-03-18*
