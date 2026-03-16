---
phase: 28-remove-account-roles
plan: 01
subsystem: auth
tags: [jwt, typescript, express, react-native, postgres, middleware]

# Dependency graph
requires:
  - phase: 27-smart-invite-join
    provides: participantId as the correct session discriminant (the role field became redundant after this)
provides:
  - Migration to drop role column from users table
  - Role-free TokenPayload (userId, email, participantId?, eventId? only)
  - participantId-based session discrimination throughout all layers
  - All registered users can create events immediately (no role restriction)
affects:
  - Any future phase touching auth, JWT, or user session handling

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "participantId presence gate: user.participantId !== undefined means magic-link participant; absence means full account user"
    - "JWT tokens carry no role field; session type is inferred purely from participantId"

key-files:
  created:
    - apps/api/src/db/migrations/013-remove-role-from-users.sql
  modified:
    - apps/api/src/services/tokenService.ts
    - apps/api/src/middleware/auth.ts
    - apps/api/src/middleware/requireOrganizer.ts
    - apps/api/src/routes/auth.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/magicLink.ts
    - apps/api/src/routes/users.ts
    - apps/gatherly-mobile/app/api/auth.ts
    - apps/gatherly-mobile/app/api/users.ts
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/app/polls.tsx
    - apps/gatherly-mobile/app/rsvp.tsx
    - apps/gatherly/src/api/auth.ts
    - apps/gatherly/src/pages/events/details.tsx
    - apps/gatherly/src/pages/events/index.tsx
    - apps/api/.env.example

key-decisions:
  - "participantId !== undefined is the sole discriminant for magic-link sessions; no role field needed"
  - "JWT_SECRET rotation required after deploy to invalidate pre-existing tokens containing role"
  - "requireOrganizer middleware kept but docstring updated; commented role-check block removed"

patterns-established:
  - "Participant gate: if (user.participantId !== undefined) { /* magic-link path */ } else { /* full account path */ }"
  - "isOrganizer in client: user?.participantId === undefined (not a role string check)"

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 28 Plan 01: Remove Account Roles Summary

**Dropped role column from users table and JWT tokens; all session-type gates now use participantId presence across API, mobile, and legacy web**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-16T06:35:02Z
- **Completed:** 2026-03-16T06:39:44Z
- **Tasks:** 2/2
- **Files modified:** 16

## Accomplishments

- Created migration 013-remove-role-from-users.sql to drop the role column from the users table
- Removed `role` from TokenPayload, all JWT generation calls, and the Express Request user type
- Replaced every `user.role === "participant"` gate with `user.participantId !== undefined` in backend routes and client code
- Removed `role` from all API response bodies (auth, magic-link, users routes)
- Mobile isOrganizer checks now use `user?.participantId === undefined` in event-details, polls, and rsvp screens

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend role removal** - `f203df3` (feat)
2. **Task 2: Client role removal** - `5c476af` (feat)

## Files Created/Modified

- `apps/api/src/db/migrations/013-remove-role-from-users.sql` - Migration to drop role column
- `apps/api/src/services/tokenService.ts` - TokenPayload without role; generateParticipantTokens payload without role
- `apps/api/src/middleware/auth.ts` - Request user type without role; removed role from both user assignment blocks
- `apps/api/src/middleware/requireOrganizer.ts` - Removed commented role-check; updated docstring
- `apps/api/src/routes/auth.ts` - Removed role from INSERT, SELECT, generateTokens, and response bodies throughout
- `apps/api/src/routes/events.ts` - Replaced `user.role === "participant"` with `user.participantId !== undefined`
- `apps/api/src/routes/magicLink.ts` - Removed role from SELECT and all response bodies
- `apps/api/src/routes/users.ts` - Removed role from SELECT and response bodies in GET/PUT /me
- `apps/gatherly-mobile/app/api/auth.ts` - Removed role from redeemMagicLink response type shapes
- `apps/gatherly-mobile/app/api/users.ts` - Removed role from UserProfile and updateMe return type
- `apps/gatherly-mobile/app/event-details.tsx` - isOrganizer now uses participantId === undefined
- `apps/gatherly-mobile/app/polls.tsx` - isOrganizer now uses participantId === undefined
- `apps/gatherly-mobile/app/rsvp.tsx` - isOrganizer now uses participantId === undefined
- `apps/gatherly/src/api/auth.ts` - Removed role from User type and MagicLinkUser type; removed hardcoded role in mapping
- `apps/gatherly/src/pages/events/details.tsx` - All three role checks replaced with participantId checks
- `apps/gatherly/src/pages/events/index.tsx` - Role check replaced with participantId check
- `apps/api/.env.example` - Added JWT_SECRET rotation note for Phase 28

## Decisions Made

- `participantId !== undefined` is the sole discriminant for magic-link sessions going forward — this is cleaner than a string enum that was already inconsistently applied
- JWT_SECRET should be rotated in production after deploying this change to force re-login and invalidate any tokens still carrying a `role` field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Manual step required after deploying this change:**

Rotate `JWT_SECRET` and `REFRESH_SECRET` values in your `.env` to invalidate all pre-existing tokens that contain the now-removed `role` field. Users will be logged out and will need to sign in again. This is a one-time migration step.

## Next Phase Readiness

- Auth layer is simpler and correct — participantId is the only session discriminant
- No blockers for future phases
- All apps compile without TypeScript errors after the role removal

---
*Phase: 28-remove-account-roles*
*Completed: 2026-03-16*
