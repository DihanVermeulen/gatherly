# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.2 UI Rehaul — Phase 30: Infrastructure — Migration and API

## Current Position

Phase: 30 of 33 (Infrastructure — Migration and API)
Plan: 04 of 04
Status: Phase complete
Last activity: 2026-03-18 — Completed 30-04-PLAN.md (potluck API routes)

Progress: [████████████████████████] v2.1 complete, v2.2 Phase 30 done (4/4 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 71 (27 v2.0 + 44 v2.1)
- Average duration: ~5m
- Total execution time: —

**By Phase (v2.2 — pending):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 30. Infrastructure | TBD | — | — |
| 31. Onboarding Screens | TBD | — | — |
| 32. Screen Redesigns | TBD | — | — |
| 33. Potluck Screens | TBD | — | — |

*Updated after each plan completion*

## Accumulated Context

### Decisions (active carry-forward)

- GlueStack UI — use components from components/ui/; no custom UI primitives
- Screen templates required before implementing any screen — if missing, ask user to create it
- SecureStore for token persistence — accessToken + user JSON; refreshToken lives in HttpOnly cookie only
- Use `npm install --ignore-scripts` in gatherly-mobile — pnpm virtual store dir length mismatch
- participantId-as-discriminant: user.participantId !== undefined = magic-link participant; absence = full account user
- fire-and-forget emails: sendX() called without await after route commits
- cover_photo must store URL string (not base64) in events table — list endpoint returns hasCoverPhoto flag only
- onboarding_complete is server-side source of truth — SecureStore is cache only, not authoritative
- Onboarding guard: check user.participantId === undefined before redirect — magic-link sessions must never hit onboarding flow
- Trigger function name is update_updated_at_column() — not set_updated_at(); always use update_updated_at_column() in new migrations
- Phase 30 DB migration (014-phase30-v22.sql) applied — potluck tables, events columns (location/cover_photo/allow_guest_invites/is_public), users columns (bio/interests/avatar_url/onboarding_complete) all exist
- Users API (30-02): GET /api/users/me returns all new profile fields; PUT /api/users/me is a dynamic patch — null clears bio/avatarUrl, onboardingComplete=false silently ignored (one-way), empty body returns 400
- Patch pattern: 'field in body' check + parallel params[]/clauses[] arrays + JSON.stringify for JSONB — use this pattern for future dynamic UPDATE routes
- Events API (30-03): list returns hasCoverPhoto boolean (no URL), detail/fetchEventById return coverPhotoUrl + location + allowGuestInvites + isPublic; PUT uses $1-$9 SET + $10 WHERE id with String(bool) coercion for optional boolean updates
- Potluck API (30-04): participantName sourced from request body for both token types; slot_taken (409) covers both full-slot and duplicate-participant cases; SELECT FOR UPDATE race guard pattern for slot booking

### Pending Todos

- `.planning/todos/pending/2026-03-10-phase-26-planning.md` — Plan Phase 26 (Public Wishlist + Push Notifications + Groups) — deferred to v2.3+

### Tech Debt

- join.tsx: add `await refreshEvents()` after `invitesApi.accept()` before `setJoinState("success")` (GAP-01)
- assetlinks.json SHA-256 fingerprint is a placeholder — replace before Android App Links work in production
- associatedDomains uses YOUR_DOMAIN placeholder — replace before iOS Universal Links work in production

### Pending DB Migrations for New Environments

- Migration 012 (v2.1): `psql -d gatherly -f apps/api/src/db/migrations/012-phase27-account-linking.sql`
- Migration 013 (v2.1): `psql -d gatherly -f apps/api/src/db/migrations/013-remove-role-from-users.sql` — also rotate JWT_SECRET + REFRESH_SECRET
- Migration 014 (v2.2): `psql -d gatherly -f apps/api/src/db/migrations/014-phase30-v22.sql` — potluck tables + events/users new columns

## Session Continuity

Last session: 2026-03-18T11:46:00Z
Stopped at: Completed 30-04-PLAN.md — potluck API routes (Phase 30 complete)
Resume file: None

Next step: Execute Phase 31 (Onboarding Screens).
