---
phase: 04-invite-system
plan: 01
subsystem: api
tags: [nanoid, express-rate-limit, invites, jwt, postgresql]

# Dependency graph
requires:
  - phase: 07-jwt-authentication
    provides: JWT authentication middleware and token service
provides:
  - Backend invite API with 5 endpoints (create, list, validate, accept, revoke)
  - Rate-limited public endpoints for invite validation and acceptance
  - Secure 21-character nanoid invite codes
  - Optional invite expiration with 30-day default
  - Link-only invites (no email/phone required)
affects: [04-invite-system, frontend-invite-ui]

# Tech tracking
tech-stack:
  added: [nanoid@5, express-rate-limit@7]
  patterns: [rate limiting for public endpoints, generic error messages for security, database transactions for atomic operations]

key-files:
  created: [apps/api/src/routes/invites.ts]
  modified: [apps/api/src/db/schema.sql, apps/api/src/server.ts, apps/api/package.json]

key-decisions:
  - "Use nanoid for invite codes (21 chars, URL-safe, cryptographically secure)"
  - "Rate limit public endpoints to 10 requests per 15 minutes per IP"
  - "Remove email_or_phone constraint to enable link-only invites"
  - "Default 30-day expiration for invites with optional override"
  - "Generic error messages to prevent invite code enumeration"

patterns-established:
  - "Rate limiting pattern: rateLimit middleware with standardHeaders for public endpoints"
  - "Transaction pattern: getClient() for atomic multi-step operations"
  - "Security pattern: generic error messages for failed lookups to prevent enumeration"
  - "Code generation pattern: nanoid() for secure, URL-safe invite codes"

# Metrics
duration: 1.5min
completed: 2026-02-08
---

# Phase 4 Plan 1: Backend Invite API Summary

**Secure invite API with nanoid code generation, express-rate-limit protection, and optional expiration support**

## Performance

- **Duration:** 1.5 min
- **Started:** 2026-02-08T19:03:13Z
- **Completed:** 2026-02-08T19:04:42Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created 5 invite endpoints: generate, list, validate, accept, revoke
- Implemented rate limiting on public endpoints (10 req/15min per IP)
- Added secure 21-character nanoid invite code generation
- Enabled link-only invites by removing email/phone constraint
- Added optional invite expiration with 30-day default

## Task Commits

Each task was committed atomically:

1. **Task 1: Install backend dependencies and update database constraint** - `539023f` (chore)
2. **Task 2: Create invite routes with rate limiting and mount in server** - `e881da6` (feat)

## Files Created/Modified
- `apps/api/src/routes/invites.ts` - Five invite endpoints with rate limiting and authentication
- `apps/api/src/db/schema.sql` - Removed email_or_phone constraint, added expires_at column and index
- `apps/api/src/server.ts` - Mounted invitesRouter at /api
- `apps/api/package.json` - Added nanoid@5 and express-rate-limit@7
- `pnpm-lock.yaml` - Updated lockfile with new dependencies

## Decisions Made

**nanoid for invite codes**: Chose nanoid over uuid for shorter, URL-safe codes (21 chars vs 36 chars). Cryptographically secure with 2^126 possible combinations, making brute force impractical.

**Rate limiting strategy**: Applied 10 requests per 15 minutes per IP only to public endpoints (validate, accept). Protected endpoints use JWT authentication so don't need rate limiting.

**Link-only invites**: Removed email_or_phone constraint to enable organizers to generate shareable invite links without specifying recipient contact info. Enables flexible sharing via any channel.

**30-day default expiration**: Balances security (time-limited access) with usability (enough time to respond). Configurable per invite via expiresInDays parameter.

**Generic error messages**: Both "invalid code" and "expired code" return same "Invalid or expired invite" message to prevent attackers from learning if a code exists.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all dependencies were compatible, database schema changes were straightforward, and TypeScript compilation succeeded on first attempt.

## User Setup Required

None - no external service configuration required. Uses existing PostgreSQL database and Express server.

## Next Phase Readiness

Backend invite API is complete and ready for frontend integration. Next phase can:
- Build UI for organizers to generate and manage invites
- Create participant invite acceptance flow with /join/:code route
- Display invite status and participant linkage in event management UI

**No blockers.** All endpoints tested via build/type-check, ready for API integration.

---
*Phase: 04-invite-system*
*Completed: 2026-02-08*
