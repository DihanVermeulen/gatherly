# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** Phase 10 - Inline Assignment Reveal

## Current Position

Phase: 10 of 10 (Inline Assignment Reveal)
Plan: 3 of 3 in current phase (gap-closure complete)
Status: Phase complete — verified 8/8 must-haves
Last activity: 2026-02-19 - Gap closure plans 10-02 + 10-03 executed; re-verified 8/8 must-haves passed

Progress: [█████████████████████] 100% (23/23 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 4.21 minutes
- Total execution time: 1.05 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-privacy | 2 | 7.9m | 3.95m |
| 02-wishlist-core | 4 | 9.64m | 2.41m |
| 04-invite-system | 2 | 10.58m | 5.29m |
| 07-jwt-authentication | 4 | 16.28m | 4.07m |
| 08-sync-events | 3 | 19.12m | 6.37m |

**Recent Trend:**
- Last 5 plans: 04-02 (9.08m), 08-01 (4.12m), 08-02 (3m), 08-03 (12m)
- Trend: Phase 8 complete; 08-03 longer due to four bug fixes found during human verification

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
- Events GET routes use optionalAuth - Backward compatible during migration, allows unauthenticated access to listings (Outcome: Good - gradual migration path)
- Wishlists require full authentication - Personal data should only be accessible to authenticated users (Outcome: Good - appropriate security for sensitive data)
- Gifts use mixed auth strategy - GET public, mutations require auth (Outcome: Good - balances public visibility with mutation protection)
- Auth-aware header UI - Conditional rendering based on user state (Outcome: Good - clear visual feedback for auth status)
- nanoid for invite codes - 21-character URL-safe codes vs 36-character UUIDs (Outcome: Good - shorter, cleaner invite URLs)
- Rate limit public endpoints - 10 requests per 15 minutes per IP on validate/accept (Outcome: Good - prevents brute force attacks)
- Link-only invites - Remove email/phone requirement for flexible sharing (Outcome: Good - enables sharing via any channel)
- 30-day default expiration - Balances security with usability (Outcome: Good - time-limited access with configurable override)
- Generic error messages for invites - Same message for invalid/expired codes (Outcome: Good - prevents enumeration attacks)
- react-qr-code for QR generation - SVG rendering with M-level error correction for invite URLs (Outcome: Good - crisp QR codes on all screen sizes)
- Clipboard API with fallback - Modern navigator.clipboard with document.execCommand fallback for non-HTTPS (Outcome: Good - works in all environments)
- Five-state join page pattern - Separate states for validating, valid, invalid, rate-limited, success (Outcome: Good - clear UX for each async flow stage)
- Public /join/:code route - Unauthenticated invite acceptance outside ProtectedRoute (Outcome: Good - participants can join before account creation)
- TanStack Query v5 as sole query library - Removed react-query v3 completely (Outcome: Good - eliminates version conflicts and bundle bloat)
- 24h garbage collection time for query cache - Balances localStorage size with offline access duration (Outcome: Good - events infrequently created, long cache acceptable)
- 5min stale time for queries - Reduces refetches while ensuring freshness for multi-user events (Outcome: Good - balances network efficiency with data freshness)
- offlineFirst network mode - Enables optimistic updates even when offline (Outcome: Good - foundation for offline-first architecture)
- Exponential backoff retry - 3 attempts with up to 30s delay for failed mutations (Outcome: Good - resilient to temporary network issues)
- Migration preserves old localStorage key - Safety during transition, users can revert if issues (Outcome: Good - never delete user data without backup)
- Migration runs before React renders - Ensures data available when cache hydrates (Outcome: Good - no race conditions)
- QueryClient at module scope - Fixed bug where new client created on every render (Outcome: Good - critical fix for cache persistence)
- useApi always true - TanStack Query handles offline-first transparently via networkMode (Outcome: Good - simplifies context, no manual API availability checks)
- Wishlist actions update cache directly - Preserve existing page API pattern without new mutation hooks (Outcome: Good - backward compatible, cache-only updates)
- Temp event IDs use 'temp-' prefix - Enables detecting optimistic vs confirmed events (Outcome: Good - clear pattern for optimistic creates)
- All mutations with networkMode: offlineFirst - Mutations run immediately even when offline (Outcome: Good - foundation for offline-first UX)
- SyncIndicator uses useRef for prevStatus - Avoids stale closure on syncing→synced transition (Outcome: Good - reliable state detection)
- Route all event mutations through dispatch() - Never call eventsApi directly from pages (Outcome: Good - enables TanStack Query offline queue and sync indicator)
- Preserve wishlist cache on refetch - queryFn merges cached wishlists into refetched events (Outcome: Good - wishlists survive background invalidation)
- useEventByIdQuery in edit page for participantDetails - Gets numeric IDs for wishlist navigation (Outcome: Good - fixes participantId required error)
- userId=0 for participant tokens - No real user account, distinguishable from real sessions (userId starts at 1 via SERIAL) (Outcome: Good - clear distinction)
- CHECK constraint in refresh_tokens - Mutual exclusivity of user_id and participant_id enforced at DB level (Outcome: Good - data integrity guarantee)
- verifyRefreshToken token_hash-only lookup - Works for both user and participant tokens without schema changes (Outcome: Good - backward compatible)
- Participant JWT claims: participantId + eventId in payload - Route handlers can identify participant scope from token (Outcome: Good - enables permission checks)
- Fire-and-dont-block email sending - Email failure cannot block invite creation, magic_link_url always returned (Outcome: Good - resilient to SMTP failures)
- 48-char nanoid for magic tokens - Higher entropy than 21-char invite codes for single-use sensitive tokens (Outcome: Good - appropriate for one-time use credentials)
- Email prefix as participant name on first magic link redemption - Reasonable default derived from invite email (Outcome: Good - auto-provisions participant without extra UI step)
- requireOrganizer middleware pattern: placed after authenticateJWT, returns 403 for participant role - Clean separation between identity (401) and authorization (403) (Outcome: Good - standard HTTP semantics)
- Gift routes and event read routes not protected by requireOrganizer - Participants should be able to view events and claim gifts per design intent (Outcome: Good - matches product spec)
- my-assignments uses authenticateJWT only (no requireOrganizer) - participants need access, organizer middleware would block them (Outcome: Good - endpoint is participant-specific)
- Five-state reveal machine: idle/loading/revealed/no-assignments/error - clear UX for each async flow stage (Outcome: Good - eliminates decipher code mechanic for participants)
- SELECT instead of DELETE for magic link redemption - tokens persist in DB so participants can re-click the same link within 7-day expiry window (Outcome: Good - matches user mental model for emailed links)
- 7-day magic link token expiry on all creation paths - consistent with JWT refresh window, 24h was too short for real-world email workflows (Outcome: Good - aligns expiry with refresh token lifecycle)
- Delete-before-insert token rotation for resend: DELETE FROM magic_link_tokens WHERE invite_id before INSERT new token — ensures no stale tokens remain after resend (Outcome: Good - clean atomic revocation)
- Silent fail on invite load in edit.tsx: .catch(() => {}) so organizer edit page works even when invite API unavailable or user unauthenticated (Outcome: Good - supplementary data cannot break core functionality)
- localStorage guard in edit.tsx invite useEffect: parseInt(id) > 2147483647 skips API call for synthetic localStorage IDs (Outcome: Good - consistent with established pattern)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Add My Gifts navigates to user's wishlist page | 2026-02-14 | 1bb33d8 | [001-add-my-gifts-navigate-to-wishlist](./quick/001-add-my-gifts-navigate-to-wishlist/) |

### Roadmap Evolution

- Phase 7 added: JWT authentication with secure routes following the zero trust principle
- Phase 8 added: Sync events to local storage first then to the database.
- Phase 9 added: Magic link access for invited members with restricted permissions (view events, manage own wishlist, claim gifts — no admin privileges)
- Phase 10 added: Inline assignment reveal — replace decipher code mechanic with gated inline reveal on event details page using JWT participant identity

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 10-03-PLAN.md (resend magic link endpoint + edit.tsx button) — Phase 10 complete
Resume file: None
