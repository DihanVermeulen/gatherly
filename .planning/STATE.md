# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.2 UI Rehaul — Phase 33: Potluck Screens

## Current Position

Phase: 33 of 33 (Potluck Screens)
Plan: 00 of TBD
Status: Not started
Last activity: 2026-03-22 — Completed Phase 32 (Screen Redesigns) — all 3 plans done, 10/10 must-haves verified

Progress: [█████████████████████████░] v2.1 complete, v2.2 Phase 30 done, Phase 31 complete

## Performance Metrics

**Velocity:**
- Total plans completed: 72 (27 v2.0 + 44 v2.1 + 1 v2.2)
- Average duration: ~5m
- Total execution time: —

**By Phase (v2.2):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 30. Infrastructure | 4 | — | — |
| 31. Onboarding Screens | 2/2 done | ~32m | ~16m |
| 32. Screen Redesigns | 2/TBD | ~25m | ~12m |
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
- Onboarding guard: use `user.onboardingComplete === false` (strict equality, not !user.onboardingComplete) — magic-link participants have undefined, not false
- welcome screen is first entry in unauth guard block — default landing for unauthenticated users
- onboarding screens registered in auth guard block (not a separate guard) — accessible to logged-in users
- router.replace('...as never') pattern for onboarding routes — Expo Router strict types don't include nested onboarding routes
- Onboarding completion pattern: usersApi.updateMe({ onboardingComplete: true }) + updateUser locally + router.replace('/(tabs)') — always in this order; catch block still calls updateUser locally (non-fatal)
- Gift Preferences field in profile-setup.tsx is cosmetic — no gift_preferences column in DB, field not sent to API
- expo-haptics required for Preferences screen chip toggles — installed via npm --ignore-scripts
- Trigger function name is update_updated_at_column() — not set_updated_at(); always use update_updated_at_column() in new migrations
- Phase 30 DB migration (014-phase30-v22.sql) applied — potluck tables, events columns (location/cover_photo/allow_guest_invites/is_public), users columns (bio/interests/avatar_url/onboarding_complete) all exist
- Phase 31 DB migration (015-phase31-onboarding.sql) applied — onboarding_complete now defaults to FALSE for new users
- Users API (30-02): GET /api/users/me returns all new profile fields; PUT /api/users/me is a dynamic patch — null clears bio/avatarUrl, onboardingComplete=false silently ignored (one-way), empty body returns 400
- usersApi.updateMe is now a patch object API: `updateMe({ name?, bio?, interests?, avatarUrl?, onboardingComplete? })` — NOT a string
- AuthContext exposes updateUser(patch: Partial<User>) helper — patches in-memory user + SecureStore cache
- Patch pattern: 'field in body' check + parallel params[]/clauses[] arrays + JSON.stringify for JSONB — use this pattern for future dynamic UPDATE routes
- Events API (30-03): list returns hasCoverPhoto boolean (no URL), detail/fetchEventById return coverPhotoUrl + location + allowGuestInvites + isPublic; PUT uses $1-$9 SET + $10 WHERE id with String(bool) coercion for optional boolean updates
- Events API (32-01): GET /api/events/:id now also returns organizerName (string|null) from users table lookup on organizer_id
- gift_exchange module is NO LONGER auto-inserted on POST /api/events — modules managed explicitly via modules-config screen
- MODULE_CATALOG pattern: define full module catalog client-side as static constant with type/label/description/icon/category/comingSoon; API active list gates interactivity only
- expo-linear-gradient installed in gatherly-mobile (npm --ignore-scripts) for hero gradient rendering
- expo-file-system installed in gatherly-mobile (npm --ignore-scripts) for cover photo base64 reading in edit-event-details
- expo-file-system EncodingType removed from main export in newer version — use string literal 'base64' instead of FileSystem.EncodingType.Base64
- Module Config auto-save pattern: optimistic update -> modulesApi.setModules(all active) -> revert on error; no Save button
- Modules are categorized: ACTIVITY (gift_exchange, white_elephant), COLLABORATION (potluck, expense_splitter, polls, rsvp), MEMORIES (photo_gallery)
- comingSoon modules: disabled toggle + grayed opacity + badge text; NOT sent to API
- showToast() helper: ToastAndroid.show() on Android, Alert.alert() on iOS — use for cross-platform toast
- Potluck API (30-04): participantName sourced from request body for both token types; slot_taken (409) covers both full-slot and duplicate-participant cases; SELECT FOR UPDATE race guard pattern for slot booking
- getById-on-mount pattern: screens needing detail fields (coverPhotoUrl, organizerName) call eventsApi.getById(id) in a useEffect and store in local state — list endpoint does not carry these fields; do NOT read detail fields from EventsContext

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
- Migration 015 (v2.2): `psql -d gatherly -f apps/api/src/db/migrations/015-phase31-onboarding.sql` — onboarding_complete defaults to FALSE

## Session Continuity

Last session: 2026-03-22
Stopped at: Phase 32 complete — all 3 plans done, verified 10/10
Resume file: None

Next step: Plan and execute Phase 33 (Potluck Screens).
