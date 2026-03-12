---
phase: 27-smart-invite-join-account-linking
plan: 01
subsystem: auth
tags: [jwt, magic-link, account-linking, participants, postgres, express]

# Dependency graph
requires:
  - phase: 09-magic-link-access-for-invited-members-with-restricted-permissions
    provides: magic_link_tokens table, /redeem endpoint, generateParticipantTokens
  - phase: 07-jwt-authentication-with-secure-routes-following-the-zero-trust-principle
    provides: generateTokens, JWT user-scoped tokens, users table
  - phase: 22-24-profile-event-metadata-invites-pricing
    provides: invites.created_by_user_id, invite management infrastructure
provides:
  - participants.user_id FK linking magic-link participants to registered user accounts
  - Smart /redeem path: existing users get user-scoped JWT instead of participant-scoped JWT
  - Post-registration participant linking: accepted invites auto-linked on sign-up
  - GET /api/events expanded to include participant-linked events for authenticated users
affects: [phase-28-onward, push-notifications, public-wishlist]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Account linking via email match: JOIN invites i ON i.participant_id = p.id WHERE LOWER(i.email) = $2 AND i.status = 'accepted'"
    - "Fire-and-forget linking: try/catch around UPDATE participants SET user_id, non-fatal"
    - "EXISTS subquery for participant-inclusive events: OR EXISTS (SELECT 1 FROM participants p2 WHERE p2.event_id = e.id AND p2.user_id = $1)"

key-files:
  created:
    - apps/api/src/db/migrations/012-phase27-account-linking.sql
  modified:
    - apps/api/src/db/schema.sql
    - apps/api/src/routes/magicLink.ts
    - apps/api/src/routes/auth.ts
    - apps/api/src/routes/events.ts

key-decisions:
  - "User-scoped token on magic-link redemption: when invite_email matches a registered user, issue generateTokens({userId, email, role}) not generateParticipantTokens"
  - "Participant linking is fire-and-forget: wrapped in try/catch, never fails main flow"
  - "events.ts GROUP BY e.id already present — handles deduplication from OR EXISTS join"
  - "EXISTS subquery only in organizer branch — participant branch (magic-link only users) already scoped to single eventId"

patterns-established:
  - "Account linking pattern: UPDATE participants SET user_id = $1 WHERE id IN (SELECT p.id FROM participants p JOIN invites i ON i.participant_id = p.id WHERE LOWER(i.email) = $2 AND i.status = 'accepted' AND p.user_id IS NULL)"

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 27 Plan 01: Smart Invite Join + Account Linking Summary

**Magic-link redemption now issues user-scoped JWTs for registered users by email-matching, with participants.user_id FK linking accepted invites on registration and events query expanded to include participant-linked events**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-12T07:13:42Z
- **Completed:** 2026-03-12T07:17:06Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Migration 012 adds `participants.user_id INTEGER REFERENCES users(id) ON DELETE SET NULL` + index
- `/redeem` endpoint: if `invite_email` matches a `users` row, links participant to user and returns user-scoped JWT (userId, email, name, role) instead of participant-scoped JWT
- `POST /register` now auto-links any previously-accepted invites to the new account via email match (fire-and-forget, non-fatal)
- `GET /api/events` organizer branch expanded with `OR EXISTS (SELECT 1 FROM participants p2 WHERE p2.event_id = e.id AND p2.user_id = $1)` — users see events they joined as participants alongside events they organise

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + smart magic-link redemption** - `22fb41e` (feat)
2. **Task 2: Post-registration linking + expanded events query** - `3a37e2b` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/api/src/db/migrations/012-phase27-account-linking.sql` - ALTER TABLE + index for participants.user_id
- `apps/api/src/db/schema.sql` - user_id column in participants CREATE TABLE + idx_participants_user_id in indexes section
- `apps/api/src/routes/magicLink.ts` - Import generateTokens; user-lookup + link + user-scoped JWT path before participant fallback
- `apps/api/src/routes/auth.ts` - Post-INSERT participant linking UPDATE via email match
- `apps/api/src/routes/events.ts` - OR EXISTS subquery in organizer branch WHERE clause

## Decisions Made

- **User-scoped token on redemption:** When a magic-link email matches a registered user, `/redeem` issues `generateTokens({userId, email, role})` and returns `{id, email, name, role, eventId, eventName}`. The participant-scoped path is unchanged for unregistered users.
- **Fire-and-forget linking:** Both the magic-link UPDATE and the registration UPDATE are wrapped in `try/catch` with `console.error` — neither can fail the primary response.
- **EXISTS not JOIN in events query:** Using `OR EXISTS (...)` avoids row multiplication that an outer LEFT JOIN would introduce; the existing `GROUP BY e.id` would handle it but EXISTS is cleaner and has better query-plan characteristics.
- **Participant branch unchanged:** The participant-token path in events.ts already scopes to `user.eventId` — no change needed there.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Existing dev databases need manual migration:**

```sql
ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
```

Or apply the migration file:

```bash
psql -d gatherly -f apps/api/src/db/migrations/012-phase27-account-linking.sql
```

## Next Phase Readiness

- Account linking foundation complete
- Mobile app (`apps/gatherly-mobile`) does not yet consume the upgraded `/redeem` response shape (`id`, `email`, `name`, `role`, `eventId`, `eventName`) — this will need handling in the join flow when the user is already registered
- The events list will now include participant-linked events for registered users; mobile EventsContext/cache layer should handle this transparently since shape is identical

---
*Phase: 27-smart-invite-join-account-linking*
*Completed: 2026-03-12*
