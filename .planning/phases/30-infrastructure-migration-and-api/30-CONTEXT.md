# Phase 30: Infrastructure — Migration and API - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the API and database schema contracts that Phases 31–33 will build against. Deliverables: DB migration adding potluck tables + events/users new columns, refactored users PATCH endpoint, cover photo column + hasCoverPhoto flag, and full potluck CRUD routes. No mobile UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Potluck API structure
- Routes nested under events: `GET/POST /api/events/:id/potluck/categories`, `PUT/DELETE /api/events/:id/potluck/categories/:catId`
- Signups: `POST /api/events/:id/potluck/signups`, `DELETE /api/events/:id/potluck/signups/:signupId`
- Category response is minimal (no embedded signups): `{ id, eventId, name, quantity, foodImageUrl, suggestionChips, createdAt }`
- Signup identity: full name visible to all event members (unlike wishlist claims which are anonymous)
- Race conflict: `409` with structured error `{ error: 'slot_taken', message: 'Slot just taken' }`

### Users PATCH semantics
- `PUT /api/users/me` accepts a partial patch object — any combination of `name`, `bio`, `interests`, `avatarUrl`, `onboardingComplete`
- `interests` array: full replace — whatever array the client sends completely replaces stored interests
- `null` value for a field explicitly clears it (sets column to NULL)
- Response: full updated user object (`id`, `name`, `email`, `bio`, `interests`, `avatarUrl`, `onboardingComplete`)
- `onboardingComplete` is one-way: once `true`, server ignores any attempt to set it back to `false`

### Cover photo endpoints
- New `cover_photo` column on events table stores a URL string (not base64)
- Events **list** endpoint returns `hasCoverPhoto: boolean` only (no image data)
- Event **detail** endpoint returns `coverPhotoUrl: string | null` (the URL reference)
- Upload flow: client sends URL string via existing `PUT /api/events/:id` — no separate upload endpoint
- `cover_photo` column added in the Phase 30 migration

### Migration defaults
- `users.onboarding_complete`: defaults to `true` for existing rows (they're already set up, skip onboarding)
- `users.interests`: defaults to empty JSON array `'[]'` (not NULL)
- `users.bio`, `users.avatar_url`: default to `NULL`
- `events.cover_photo`: default `NULL`
- `events.location`: default `NULL`
- `events.allow_guest_invites`: default `false`
- `events.is_public`: default `false`
- All `ADD COLUMN` statements use `IF NOT EXISTS` (migration is idempotent, safe to re-run)

### Claude's Discretion
- Exact SQL types for new columns (e.g., `TEXT` vs `VARCHAR`, `JSONB` vs `TEXT` for interests/suggestionChips)
- How `suggestionChips` is stored (JSONB array recommended)
- Potluck status field (draft/active) schema design
- Route file organization (extend modules.ts vs new potluck.ts)

</decisions>

<specifics>
## Specific Ideas

- The interests and suggestionChips fields are arrays — JSONB is the natural PostgreSQL type
- Race condition on signups needs to use a database-level check (row count vs quantity) inside a transaction to be reliable
- Existing `PUT /api/users/me` currently takes a positional `name` string — this needs to be refactored to accept a partial object

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-infrastructure-migration-and-api*
*Context gathered: 2026-03-18*
