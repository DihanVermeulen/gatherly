---
phase: 07-jwt-authentication
plan: 02
subsystem: auth
tags: [express, auth-routes, bcrypt, cookie-parser, cors, jwt, rest-api]

# Dependency graph
requires:
  - phase: 07-01
    provides: JWT token service, user tables, refresh token rotation infrastructure
provides:
  - REST authentication endpoints (register, login, refresh, logout)
  - HttpOnly cookie-based refresh token delivery
  - CORS configuration with credentials support for cross-origin authentication
affects: [07-03, 07-04, 07-05, frontend-auth-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [refresh token rotation via POST /refresh, generic error messages to prevent user enumeration, HttpOnly cookies with strict sameSite]

key-files:
  created:
    - apps/api/src/routes/auth.ts
  modified:
    - apps/api/src/server.ts

key-decisions:
  - "Generic 'Invalid credentials' error for both 'user not found' and 'wrong password' to prevent user enumeration"
  - "Refresh token rotation: old token deleted, new token issued on every POST /refresh"
  - "HttpOnly cookie path set to /api/auth to scope cookie to auth endpoints only"
  - "bcrypt saltRounds = 12 for password hashing (balance security vs performance)"
  - "CORS credentials: true with configurable origin via CORS_ORIGIN env var"

patterns-established:
  - "Auth route error handling: try/catch with console.error logging and 500 fallback"
  - "Cookie configuration helper: getRefreshCookieOptions() centralizes HttpOnly/secure/sameSite settings"
  - "User registration defaults to 'participant' role, can be changed later"
  - "Logout always succeeds (200) even if token revocation fails or no token present"

# Metrics
duration: 2.45min
completed: 2026-02-08
---

# Phase 7 Plan 02: Auth API Routes Summary

**Express authentication endpoints (register, login, refresh, logout) with bcrypt password hashing, HttpOnly refresh cookies, and CORS credentials support**

## Performance

- **Duration:** 2.45 min
- **Started:** 2026-02-08T06:38:28Z
- **Completed:** 2026-02-08T06:40:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POST /api/auth/register creates user account with bcrypt-hashed password, returns JWT + sets refresh cookie
- POST /api/auth/login validates credentials, returns JWT + sets refresh cookie
- POST /api/auth/refresh rotates refresh tokens (deletes old, issues new), returns new JWT
- POST /api/auth/logout revokes refresh token and clears cookie
- CORS configured with credentials: true for cross-origin cookie handling between frontend (3000) and backend (5001)
- Generic error messages prevent user enumeration (same "Invalid credentials" for both missing user and wrong password)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auth routes (register, login, refresh, logout)** - `f4ef071` (feat)
2. **Task 2: Wire auth routes and cookie-parser into Express server** - `f1a8993` (feat)

## Files Created/Modified
- `apps/api/src/routes/auth.ts` - Four authentication endpoints with bcrypt hashing, JWT generation, refresh token rotation, and HttpOnly cookie management
- `apps/api/src/server.ts` - Added cookie-parser middleware, CORS credentials config, mounted auth routes at /api/auth

## Decisions Made

1. **Generic error messages for login**: Return "Invalid credentials" for both "user not found" and "wrong password" to prevent user enumeration attacks. Makes it harder for attackers to discover valid email addresses.

2. **Refresh token rotation pattern**: On POST /refresh, old token is deleted from database before new token issued. Implements forward secrecy - if old token is compromised after rotation, it's already invalid.

3. **HttpOnly cookie path scoped to /api/auth**: Refresh cookies only sent to auth endpoints, not to all API routes. Reduces attack surface by limiting cookie exposure.

4. **bcrypt saltRounds = 12**: Industry standard for password hashing. Higher than default 10 for additional security, but not so high it impacts registration performance.

5. **CORS origin configurable via env var**: Defaults to http://localhost:3000 for development. Production can override via CORS_ORIGIN for deployed frontend URL.

6. **User registration defaults to 'participant' role**: New users start with participant access. Organizer role can be granted manually or via separate admin flow in future phase.

7. **Logout always succeeds**: Returns 200 even if token revocation fails or no token present. Prevents client-side error handling complexity - logout should always work from user perspective.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added explicit Router type annotation**
- **Found during:** Task 1 (Type checking)
- **Issue:** TypeScript error "The inferred type of 'router' cannot be named without a reference to @types/express-serve-static-core. This is likely not portable. A type annotation is necessary."
- **Fix:** Changed `const router = Router()` to `const router: Router = Router()` for explicit type annotation
- **Files modified:** apps/api/src/routes/auth.ts
- **Verification:** `pnpm check-types` passes with no errors
- **Committed in:** f4ef071 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** TypeScript inference issue with Express Router export. Type annotation required for build to succeed. No behavioral changes.

## Issues Encountered

**TypeScript Router type inference**: Express Router type inference fails when exported as default without explicit type annotation. This is a known limitation with how TypeScript resolves re-exported types from nested node_modules. Solution: explicit type annotation on const declaration.

## User Setup Required

**Environment variables must be added before testing auth endpoints:**

1. Ensure `apps/api/.env` has been created from `.env.example` (completed in Phase 7 Plan 01)
2. Verify JWT_SECRET and REFRESH_SECRET are set
3. Optional: Set `CORS_ORIGIN` for custom frontend URL (defaults to http://localhost:3000)

**Database migration (if not already applied):**
```bash
psql -d gatherly -f apps/api/src/db/migrations/002_add_users_refresh_tokens.sql
```

**Verification:**
- Start API: `cd apps/api && pnpm dev`
- Server should start on port 5001 without errors
- Auth routes available at http://localhost:5001/api/auth/

## Next Phase Readiness

**Ready for Phase 7 Plan 03 (Protect routes with authentication middleware):**
- Auth endpoints ready to issue access tokens
- Frontend can now register/login users and receive JWT access tokens
- Refresh token rotation working via HttpOnly cookies
- CORS credentials configured for cross-origin requests

**Ready for manual testing:**
- Can test registration via: `curl -X POST http://localhost:5001/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123","name":"Test User"}'`
- Can test login via: `curl -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'`

**No blockers or concerns.**

---
*Phase: 07-jwt-authentication*
*Completed: 2026-02-08*
