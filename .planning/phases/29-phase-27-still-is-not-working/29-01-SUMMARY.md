---
phase: 29-phase-27-still-is-not-working
plan: 01
subsystem: auth
tags: [magic-link, jwt, express, expo-router, react-native]

# Dependency graph
requires:
  - phase: 27-smart-invite-join-account-linking
    provides: magic_link_tokens table, /redeem endpoint, redeemMagicLink client method
provides:
  - POST /api/auth/magic-link/lookup — read-only event preview from magic link token
  - authApi.lookupMagicLink(token) typed client method with MagicLinkPreview interface
  - join.tsx router.push navigation (back navigation works after joining)
  - join.tsx handleJoin without refreshEvents() (pull-to-refresh is sufficient)
affects: [29-02, 29-03, magic-link screen plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-only token lookup: hash token, query magic_link_tokens, JOIN invites+events+users, return preview without side effects"
    - "Shared rate limiter across lookup + redeem: same redeemRateLimiter instance applied to both POST routes"

key-files:
  created: []
  modified:
    - apps/api/src/routes/magicLink.ts
    - apps/gatherly-mobile/app/api/auth.ts
    - apps/gatherly-mobile/app/join.tsx

key-decisions:
  - "lookup endpoint is purely read-only: no participant creation, no token consumption, no invite status change"
  - "organizer_name resolved via LEFT JOIN users ON events.organizer_id = u.id (not invites.created_by_user_id)"
  - "participant_count cast to int via ::int to return a number not a string from COUNT(*)"
  - "router.push replaces router.replace for event-details success navigation so back gesture works"
  - "refreshEvents() removed from handleJoin; pull-to-refresh is sufficient"

patterns-established:
  - "Magic-link preview pattern: POST /lookup before POST /redeem for pre-join UI without side effects"

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 29 Plan 01: Lookup Endpoint + join.tsx Navigation Fix Summary

**Read-only POST /api/auth/magic-link/lookup returns event preview (name, organizer, participant count, invite code) without creating participants, plus router.push and no-refreshEvents fixes in join.tsx**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-13T15:29:15Z
- **Completed:** 2026-03-13T15:37:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- New `/lookup` endpoint in `magicLink.ts` reads event preview from magic link token without any side effects
- `authApi.lookupMagicLink(token)` method with `MagicLinkPreview` interface added to mobile client
- `join.tsx` success navigation changed from `router.replace` to `router.push` (back navigation works)
- `refreshEvents()` removed from `handleJoin` try block (pull-to-refresh is sufficient)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add /lookup endpoint and lookupMagicLink client method** - `312bb6a` (feat)
2. **Task 2: Fix join.tsx navigation and remove refreshEvents** - `7cb0337` (fix)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `apps/api/src/routes/magicLink.ts` - Added POST /lookup route before /redeem; same rate limiter; JOINs invites+events+users for preview; no side effects
- `apps/gatherly-mobile/app/api/auth.ts` - Added MagicLinkPreview interface and lookupMagicLink method
- `apps/gatherly-mobile/app/join.tsx` - router.push instead of router.replace for event-details; removed await refreshEvents() from handleJoin

## Decisions Made
- `organizer_name` resolved via `LEFT JOIN users u ON e.organizer_id = u.id` (organizer owns the event) rather than `invites.created_by_user_id` (invite sender, which might differ)
- `participant_count` cast `::int` so PostgreSQL returns a JS number instead of a string
- `eventDate` converted via `.toISOString()` on the Date object returned by pg driver (null-safe)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 29-02 can now use `authApi.lookupMagicLink(token)` to show event preview on the magic-link screen before the user decides to join
- Plan 29-03 builds further on the join flow
- No blockers

---
*Phase: 29-phase-27-still-is-not-working*
*Completed: 2026-03-13*
