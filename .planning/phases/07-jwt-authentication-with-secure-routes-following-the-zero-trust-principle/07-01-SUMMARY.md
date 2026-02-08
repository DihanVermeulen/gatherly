---
phase: 07-jwt-authentication
plan: 01
subsystem: auth
tags: [jwt, jsonwebtoken, bcrypt, cookie-parser, postgres, express, middleware]

# Dependency graph
requires:
  - phase: 01-foundation-privacy
    provides: PostgreSQL database with schema and connection pooling
provides:
  - JWT authentication infrastructure with access and refresh tokens
  - Token service with generation, verification, and rotation
  - Express authentication middleware (strict and permissive)
  - Users and refresh_tokens database tables
affects: [07-02, 07-03, 07-04, 07-05, 08-event-organizer-dashboard]

# Tech tracking
tech-stack:
  added: [jsonwebtoken@9.0.3, bcrypt@6.0.0, cookie-parser@1.4.7, @types/jsonwebtoken@9.0.10, @types/bcrypt@6.0.0, @types/cookie-parser@1.4.10]
  patterns: [JWT access + refresh token rotation, PostgreSQL-backed token storage, Express Request interface extension for user context]

key-files:
  created:
    - apps/api/src/services/tokenService.ts
    - apps/api/src/middleware/auth.ts
    - apps/api/src/db/migrations/002_add_users_refresh_tokens.sql
    - apps/api/.env.example
    - apps/api/package.json
    - apps/api/tsdown.config.ts
  modified:
    - apps/api/src/db/schema.sql
    - pnpm-lock.yaml

key-decisions:
  - "HS256 algorithm for JWT signing (simpler than RS256, adequate for symmetric secret use case)"
  - "15-minute access token expiry with 7-day refresh tokens (balances security and UX)"
  - "SHA-256 hashing of refresh tokens before database storage (prevents token leakage if DB compromised)"
  - "Skip access token blacklisting, rely on short TTL (15min) for simplicity in Phase 7"
  - "Extend Express Request interface globally with user property for type safety"
  - "Provide both authenticateJWT (strict) and optionalAuth (permissive) middleware for gradual migration"

patterns-established:
  - "JWT token service pattern: generateTokens, verifyAccessToken, verifyRefreshToken, revoke functions"
  - "Refresh token rotation: new refresh token issued on each refresh, old token deleted"
  - "Database-backed refresh tokens: enable revocation for logout and security events"
  - "Global Express Request type extension pattern for TypeScript middleware context"

# Metrics
duration: 4.5min
completed: 2026-02-08
---

# Phase 7 Plan 01: JWT Authentication Foundation Summary

**Backend JWT authentication with HS256 access/refresh tokens, PostgreSQL-backed token storage, and Express middleware for protected routes**

## Performance

- **Duration:** 4.5 min
- **Started:** 2026-02-08T06:29:30Z
- **Completed:** 2026-02-08T06:34:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Users and refresh_tokens tables with role-based access (organizer/participant)
- Token service generating 15-min access tokens and 7-day refresh tokens with HS256
- Refresh token rotation with SHA-256 hashing for secure database storage
- Express authentication middleware: authenticateJWT (strict) and optionalAuth (permissive)
- Global TypeScript Request extension for type-safe user context in routes
- Token revocation support for logout and security events

## Task Commits

Each task was committed atomically:

1. **Task 1: Install backend auth dependencies and create database migration** - `24a4017` (chore)
2. **Task 2: Create token service and authentication middleware** - `a1154e8` (feat)

## Files Created/Modified
- `apps/api/src/services/tokenService.ts` - JWT generation/verification, refresh token rotation, revocation functions
- `apps/api/src/middleware/auth.ts` - authenticateJWT (strict 401 on missing/invalid token), optionalAuth (allows unauthenticated)
- `apps/api/src/db/migrations/002_add_users_refresh_tokens.sql` - Users table with email/password_hash/role, refresh_tokens table with CASCADE delete
- `apps/api/src/db/schema.sql` - Added users and refresh_tokens tables with indexes and triggers
- `apps/api/.env.example` - JWT_SECRET and REFRESH_SECRET environment variables
- `apps/api/package.json` - Added jsonwebtoken, bcrypt, cookie-parser dependencies
- `apps/api/tsdown.config.ts` - Excluded SQL files from build to prevent parse errors

## Decisions Made

1. **HS256 algorithm over RS256**: Symmetric secret signing is simpler for this use case. RS256 would require key pair management, which adds complexity without benefit for internal API authentication.

2. **15-minute access token TTL**: Short expiry minimizes attack window if token is compromised. Combined with 7-day refresh tokens, provides good security/UX balance.

3. **SHA-256 hash refresh tokens before storage**: Even if database is compromised, attacker cannot use raw tokens to authenticate. Requires original token to verify.

4. **Skip access token blacklisting in Phase 7**: Rely on short 15-min TTL instead of Redis/PostgreSQL blacklist. Simplifies implementation. Can add blacklisting in future phase if needed for immediate revocation.

5. **Provide both strict and permissive middleware**: `authenticateJWT` enforces authentication (401 on failure), `optionalAuth` allows gradual migration by letting unauthenticated requests through without req.user.

6. **Global Express Request extension**: Declare user property in global namespace for TypeScript type safety across all route handlers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded SQL files from tsdown build config**
- **Found during:** Task 2 (Build verification)
- **Issue:** tsdown config included all `src/**/*` files, causing build to fail parsing SQL migration files with "Expected semicolon" errors
- **Fix:** Added `!src/**/*.sql` exclusion pattern to tsdown.config.ts entry array
- **Files modified:** apps/api/tsdown.config.ts
- **Verification:** `pnpm build` succeeds, all TypeScript files compile without errors
- **Committed in:** a1154e8 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed TypeScript type errors in tokenService**
- **Found during:** Task 2 (Type checking)
- **Issue:** JWT_SECRET and REFRESH_SECRET typed as `string | undefined`, causing jwt.sign() to reject them. Even though runtime check throws error if undefined, TypeScript couldn't infer narrowed type.
- **Fix:** Changed to `const JWT_SECRET = process.env.JWT_SECRET as string` with separate `if (!process.env.JWT_SECRET)` check. Type assertion safe because error is thrown if undefined.
- **Files modified:** apps/api/src/services/tokenService.ts
- **Verification:** `pnpm check-types` passes with no errors
- **Committed in:** a1154e8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes essential for build to succeed. No scope creep, no behavioral changes.

## Issues Encountered

**TypeScript const assertions with environment variables**: TypeScript can't infer that `const SECRET = process.env.SECRET; if (!SECRET) throw` narrows type to exclude undefined. Had to use type assertion pattern instead. This is a known TypeScript limitation with control flow analysis.

**tsdown build including SQL files**: The glob pattern `src/**/*` includes all file types. SQL files are valid to include in source control but not valid JavaScript/TypeScript. Solution: explicit exclusion pattern in entry config.

## User Setup Required

**Environment variables must be added before running the API:**

1. Create `apps/api/.env` from `apps/api/.env.example`
2. Generate strong secrets for:
   - `JWT_SECRET` - Use `openssl rand -base64 32` or similar
   - `REFRESH_SECRET` - Use different secret than JWT_SECRET
3. Apply database migration:
   ```bash
   psql -d gatherly -f apps/api/src/db/migrations/002_add_users_refresh_tokens.sql
   ```

**Verification:**
- Database has users and refresh_tokens tables: `\dt` in psql should show both
- API starts without "JWT_SECRET required" error

## Next Phase Readiness

**Ready for Phase 7 Plan 02 (Auth routes):**
- Users table ready for registration/login
- Token service ready to generate tokens on login
- Refresh tokens table ready to store rotation tokens
- Auth middleware ready to protect routes

**No blockers or concerns.**

---
*Phase: 07-jwt-authentication*
*Completed: 2026-02-08*
