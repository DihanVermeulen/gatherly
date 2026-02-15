---
phase: 09-magic-link-access
plan: 01
subsystem: auth
tags: [jwt, postgres, nodemailer, magic-link, refresh-tokens, participant-auth]

# Dependency graph
requires:
  - phase: 07-jwt-authentication
    provides: JWT token service, refresh_tokens table, auth middleware
  - phase: 04-invite-system
    provides: invites table with invite_code for magic link references

provides:
  - magic_link_tokens table for single-use time-limited tokens
  - refresh_tokens extended with participant_id for participant sessions
  - generateParticipantTokens() function for magic-link JWT creation
  - revokeParticipantTokens() function for session invalidation
  - TokenPayload extended with participantId and eventId optional fields
  - req.user extended with participantId and eventId for route handlers
  - nodemailer installed for email delivery in future plans

affects:
  - 09-02 (magic link generation endpoint uses generateParticipantTokens)
  - 09-03 (magic link exchange/redemption endpoint)
  - any route that needs to identify participant sessions via req.user.participantId

# Tech tracking
tech-stack:
  added:
    - nodemailer@^8.0.1 (email delivery)
    - "@types/nodemailer@^7.0.9" (TypeScript types)
  patterns:
    - "Participant tokens: userId=0, email='', role='participant' with participantId+eventId in payload"
    - "CHECK constraint ensures refresh_tokens has either user_id OR participant_id, never both"
    - "Spread operator pattern for optional claims: ...(payload.participantId !== undefined && { participantId })"

key-files:
  created:
    - apps/api/src/db/migrations/009-magic-link-tokens.sql
  modified:
    - apps/api/src/db/schema.sql
    - apps/api/src/services/tokenService.ts
    - apps/api/src/middleware/auth.ts
    - apps/api/package.json

key-decisions:
  - "userId=0 for participant tokens - no real user account, distinguishable from real user sessions"
  - "CHECK constraint in refresh_tokens ensures mutual exclusivity of user_id and participant_id"
  - "verifyRefreshToken unchanged - token_hash-only lookup works for both user and participant tokens"
  - "Spread pattern for optional claims in req.user assignment avoids undefined values on object"

patterns-established:
  - "Participant session pattern: generateParticipantTokens stores with participant_id, routes check req.user.participantId"
  - "Dual-owner refresh_tokens: user sessions use user_id column, participant sessions use participant_id column"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 9 Plan 01: Magic Link DB and Token Infrastructure Summary

**magic_link_tokens table, participant-scoped JWTs with generateParticipantTokens(), and refresh_tokens extended with participant_id CHECK constraint**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T07:13:01Z
- **Completed:** 2026-02-15T07:15:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created magic_link_tokens table (invite_id FK, token_hash, expires_at) in migration and schema
- Extended refresh_tokens with nullable participant_id and mutual-exclusivity CHECK constraint (either user_id or participant_id, never both)
- Added generateParticipantTokens() that creates participant-scoped JWTs and stores refresh token with participant_id
- Added revokeParticipantTokens() for session invalidation by participant
- Extended TokenPayload interface with optional participantId and eventId fields
- Updated authenticateJWT and optionalAuth to propagate participantId/eventId onto req.user
- Installed nodemailer + @types/nodemailer for email delivery

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and nodemailer install** - `1a82cb4` (feat)
2. **Task 2: Extend TokenPayload, add generateParticipantTokens, update auth middleware** - `ba208c0` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/api/src/db/migrations/009-magic-link-tokens.sql` - Migration: magic_link_tokens table + refresh_tokens ALTER for participant_id
- `apps/api/src/db/schema.sql` - Updated refresh_tokens definition (nullable user_id, participant_id, CHECK constraint) + magic_link_tokens table + new indexes
- `apps/api/src/services/tokenService.ts` - Extended TokenPayload, added generateParticipantTokens and revokeParticipantTokens
- `apps/api/src/middleware/auth.ts` - Extended req.user interface and assignment with participantId/eventId
- `apps/api/package.json` - Added nodemailer dependency and @types/nodemailer devDependency

## Decisions Made

- **userId=0 for participant tokens** - Participant sessions have no real user account; using 0 clearly distinguishes them from real users (real user IDs start at 1 via SERIAL). Routes can check `userId === 0` or `participantId !== undefined` to distinguish session type.
- **CHECK constraint for mutual exclusivity** - `refresh_tokens_owner_check` ensures a token row always has exactly one owner type (user or participant). Added to both migration (ALTER) and schema.sql (fresh installs).
- **verifyRefreshToken unchanged** - The existing query `WHERE token_hash = $1 AND expires_at > NOW()` already works for both token types since it only checks the hash. No schema join needed.
- **Spread pattern for optional claims** - Used `...(payload.participantId !== undefined && { participantId: payload.participantId })` in auth middleware to avoid setting `participantId: undefined` on req.user (which would appear in JSON but be undefined).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript type check passed cleanly on both tasks.

## User Setup Required

None - no external service configuration required. nodemailer will require SMTP credentials in a future plan when email sending is implemented.

## Next Phase Readiness

- magic_link_tokens table ready for Plan 02 (magic link generation endpoint)
- generateParticipantTokens() available for use in token exchange endpoint
- req.user.participantId available for permission checks in Plan 03
- nodemailer installed and ready for email service implementation

---
*Phase: 09-magic-link-access*
*Completed: 2026-02-15*
