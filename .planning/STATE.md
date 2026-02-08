# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** Phase 7 - JWT Authentication

## Current Position

Phase: 7 of 7 (JWT Authentication with Secure Routes)
Plan: 3 of 5
Status: In progress
Last activity: 2026-02-08 - Completed 07-03-PLAN.md (Frontend auth system)

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 2.96 minutes
- Total execution time: 0.44 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-privacy | 2 | 7.9m | 3.95m |
| 02-wishlist-core | 4 | 9.64m | 2.41m |
| 07-jwt-authentication | 3 | 10.46m | 3.49m |

**Recent Trend:**
- Last 5 plans: 02-04 (2.68m), 07-01 (4.5m), 07-02 (2.45m), 07-03 (3.51m)
- Trend: Phase 7 frontend auth completed in 3.51m, consistent velocity with complex React context implementation

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Redesign existing app vs. new app - Leverage existing backend, assignment algorithm, and data (Outcome: Good - preserves working code)
- Mobile-first vs. responsive design - User designs are iOS-style mobile mockups, desktop as secondary (Outcome: Pending)
- Keep existing API structure - Backend is stable, complex assignment logic works (Outcome: Pending)
- Base64 image storage - Consistent with existing gift image pattern, no file upload service needed (Outcome: Good - used in wishlists)
- Separate claims table - UNIQUE constraint enables atomic claiming operations (Outcome: Good - prevents race conditions at DB level)
- Optional wishlists field - Event type backward compatible with v1.0 data (Outcome: Good - zero-friction compatibility)
- Removed PostCSS 7 compat for Tailwind v3 - Native Tailwind v3 required for Konsta UI (Outcome: Good - build succeeds)
- Wrapped Tailwind config with konstaConfig() - Official Konsta integration pattern (Outcome: Good - theme extensions added)
- Used konsta/react/theme.css import - Konsta v5 React-specific theme path (Outcome: Good - build succeeds)
- Enabled class-based dark mode - Allows future dark mode toggle (Outcome: Good - ready for Phase 2)
- Lucide React icons over Material Symbols - User preference for React-specific libraries (Outcome: Good - Gift and CheckCircle icons in wishlist components)
- Three image upload methods in WishlistForm - Camera, gallery, URL paste for maximum flexibility (Outcome: Good - covers all user scenarios)
- Priority badge visibility differs by context - All levels in personal view, HIGH only in registry view (Outcome: Good - reduces visual noise in browsing)
- Swipe threshold of 80px to reveal delete button - Balances accidental vs intentional swipe detection (Outcome: Good - smooth UX with touch gestures)
- Deterministic avatar colors from name hash - Same participant always gets same color across sessions (Outcome: Good - visual consistency without storage)
- Claim warning before delete - Prevents accidental deletion of items others are planning to buy (Outcome: Good - protects user intent)
- HS256 algorithm for JWT signing - Symmetric secret signing simpler than RS256 for internal API (Outcome: Good - adequate security without key pair management)
- 15-minute access token expiry - Short TTL minimizes attack window, balanced with 7-day refresh tokens (Outcome: Good - security/UX balance)
- Skip access token blacklisting in Phase 7 - Rely on 15min TTL instead of Redis/PostgreSQL blacklist (Outcome: Good - simplifies implementation, can add later if needed)
- SHA-256 hash refresh tokens before storage - Protects against database compromise (Outcome: Good - defense in depth)
- Generic error messages for login - Return "Invalid credentials" for both user not found and wrong password to prevent user enumeration (Outcome: Good - security best practice)
- HttpOnly cookie path scoped to /api/auth - Refresh cookies only sent to auth endpoints, not all API routes (Outcome: Good - reduces attack surface)
- bcrypt saltRounds = 12 - Industry standard for password hashing, balances security vs performance (Outcome: Good - adequate for 2026 security standards)
- Logout always succeeds - Returns 200 even if token revocation fails (Outcome: Good - prevents client-side error handling complexity)
- Access token stored in memory only (not localStorage) - Prevents XSS attacks from accessing tokens (Outcome: Good - more secure, restored via refresh on page reload)
- Auto-refresh every 14 minutes - Ensures users never experience token expiry during active sessions (Outcome: Good - seamless UX with no re-auth prompts)
- Queue pattern for concurrent refresh requests - Prevents multiple simultaneous refresh calls and race conditions (Outcome: Good - single refresh handles multiple concurrent 401s)
- Generic error messages on login/register - Security best practice to prevent user enumeration (Outcome: Good - shows "Invalid credentials" instead of "User not found")

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Roadmap Evolution

- Phase 7 added: JWT authentication with secure routes following the zero trust principle

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 07-03-PLAN.md (Frontend auth system)
Resume file: None
