# Phase 27: Smart Invite Join + Account Linking - Research

**Researched:** 2026-03-12
**Domain:** JWT authentication, PostgreSQL schema migration, magic link redemption, account linking
**Confidence:** HIGH

---

## Summary

Phase 27 adds two orthogonal account-linking features to an existing invite/auth system: (1) detecting an existing user account at magic link redemption and issuing a user-scoped token instead of a participant-scoped one, and (2) linking orphaned participant records to a new user account at registration time. A third change widens the `GET /api/events` query to include events where the authenticated user has a `participants` row.

All three changes are small and localized. The hard architectural decisions (token shape, HttpOnly cookie pattern, `generateTokens` vs `generateParticipantTokens`, `EventsProvider key={session}` remount) are already made in prior phases. This phase slots in cleanly because the data model already has `invites.email` (the join key between participants and users) and `participants` rows already carry `event_id`.

The one new piece of schema is `participants.user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`. Everything else is query logic inside existing endpoints.

**Primary recommendation:** Implement in a single migration + three focused backend edits + one mobile guard. No new routes needed; no mobile screen changes needed beyond a token-shape awareness fix.

---

## Standard Stack

This phase touches existing infrastructure only. No new libraries are required.

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsonwebtoken | existing | Sign/verify JWTs | Already used in tokenService.ts |
| bcrypt | existing | Password hashing | Already in auth.ts register |
| pg (via connection.ts) | existing | PostgreSQL queries | Project standard |
| express | existing | Route handlers | Project standard |

### No New Libraries Needed

All capabilities required exist in the codebase. The `generateTokens()` function in `tokenService.ts` already produces user-scoped tokens with `userId + email + role`. The `generateParticipantTokens()` function produces participant-scoped tokens. Phase 27 selects between them at redemption time — no new token infrastructure is required.

---

## Architecture Patterns

### Token Shape — Existing Duality

The codebase already has two token types with distinct JWT payloads:

**User-scoped token** (from `generateTokens`):
```typescript
// Source: apps/api/src/services/tokenService.ts
{
  userId: number,     // real user ID
  email: string,
  role: 'organizer' | 'participant',
  // NO participantId or eventId
}
```

**Participant-scoped token** (from `generateParticipantTokens`):
```typescript
// Source: apps/api/src/services/tokenService.ts
{
  userId: 0,          // sentinel — no real account
  email: '',
  role: 'participant',
  participantId: number,
  eventId: number,
}
```

The `GET /api/events` route branches on `user.role === 'participant'` to decide which query to run. After Phase 27, an existing user who redeems a magic link gets a user-scoped token (userId = their real ID, role = their real role), so `GET /api/events` will use the organizer branch (events where organizer_id = userId OR participant.user_id = userId).

**Key insight:** A user-scoped token does NOT carry `participantId` or `eventId`. Routes that check `req.user?.participantId` (e.g. `GET /:id/my-assignments`) will require callers to pass event ID explicitly or be adapted. Research shows `my-assignments` is only used by the participant-only flow, so this is not a blocking concern for this phase.

### The Three Backend Changes

#### Change 1: Schema Migration

```sql
-- Safe to re-run (project pattern: IF NOT EXISTS / IF NOT EXISTS)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
```

- `ON DELETE SET NULL` means deleting a user account orphans participant records (does not cascade-delete participation history).
- `IF NOT EXISTS` means the migration is idempotent and safe to apply to dev databases.

#### Change 2: `POST /api/auth/magic-link/redeem` (magicLink.ts)

Current behavior: always calls `generateParticipantTokens()` and returns a participant-scoped session.

New behavior:
1. After resolving `participantId` (either existing or newly created), look up `invites.email` for the invite.
2. Query `users WHERE email = invite_email` (case-insensitive, same pattern as login).
3. If a matching user exists:
   - `UPDATE participants SET user_id = $userId WHERE id = $participantId`
   - Call `generateTokens({ userId, email, role })` — returns user-scoped token.
   - Return `{ accessToken, user: { id, email, name, role } }` — same shape as login response.
4. If no matching user:
   - Proceed as today — call `generateParticipantTokens()`, return participant-scoped response.

The mobile `redeemMagicLink()` function in `app/api/auth.ts` currently destructures the participant-specific fields (`participantId`, `participantName`, etc.) from the response. It must be updated to handle both response shapes.

#### Change 3: `POST /api/auth/register` (auth.ts)

Current behavior: inserts user, generates tokens, returns immediately.

New behavior after user insertion:
```sql
UPDATE participants SET user_id = $newUserId
WHERE id IN (
  SELECT p.id FROM participants p
  JOIN invites i ON i.participant_id = p.id
  WHERE i.email = $registrationEmail
    AND i.status = 'accepted'
)
```
This runs after `COMMIT` (user row exists), as a fire-and-forget-style update. No transaction needed — the update is best-effort; if it fails the user is still registered. If it succeeds the user's events appear on their next `GET /api/events`.

#### Change 4: `GET /api/events` (events.ts)

Current behavior:
```typescript
// Organizer path:
WHERE e.organizer_id = $userId OR e.organizer_id IS NULL
// Participant path:
WHERE e.id = $eventId
```

New behavior for user-scoped tokens (role !== 'participant'):
```sql
WHERE e.organizer_id = $1
   OR e.organizer_id IS NULL
   OR EXISTS (
     SELECT 1 FROM participants p
     WHERE p.event_id = e.id AND p.user_id = $1
   )
```

The `OR EXISTS` subquery is the only change. It uses the new `participants.user_id` column. The `idx_participants_user_id` index makes this efficient.

### Recommended Project Structure

No new files. All changes are in existing files:

```
apps/api/src/
├── db/
│   ├── schema.sql                    -- ADD: ALTER TABLE participants ADD COLUMN user_id
│   └── migrations/012-phase27-account-linking.sql  -- NEW migration file
├── routes/
│   ├── magicLink.ts                  -- MODIFY: email→user lookup at redemption
│   ├── auth.ts                       -- MODIFY: link participants post-register
│   └── events.ts                     -- MODIFY: OR EXISTS participants query
apps/gatherly-mobile/app/
└── api/
    └── auth.ts                       -- MODIFY: redeemMagicLink() handle both response shapes
```

### Response Shape Unification

The current `redeemMagicLink()` mobile function hardcodes the participant-only response shape:

```typescript
// Source: apps/gatherly-mobile/app/api/auth.ts lines 56-79
const { participantId, participantName, eventId, eventName, role } = response.data.user;
return {
  accessToken: response.data.accessToken,
  user: {
    id: participantId,
    email: '',
    name: participantName,
    role,
    participantId,
    eventId,
    eventName,
  },
};
```

When the backend returns a user-scoped response (`{ id, email, name, role }` — same shape as login), this destructuring breaks. The fix: check `response.data.user.participantId` — if present, use current participant path; if absent, treat as a regular user login response (same shape the `login()` function already handles).

The `magic-link/[token].tsx` screen uses `response.user.eventId` to navigate to the event after redemption. When the user is an existing account holder, there is no `eventId` in the JWT. The screen must handle this: either navigate to the events list (tabs) rather than a specific event, or the backend must include `eventId` in the user-scoped response as an optional hint field.

**Recommendation:** Include `eventId` as an optional extra field in the user-scoped response when returning from magic link redemption (not in the JWT itself, just in the response body). This keeps navigation consistent without requiring the screen to change its destination logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token generation for user-scoped session | New token builder | `generateTokens()` in tokenService.ts | Already handles user_id + refresh token storage |
| Email lookup for account matching | Custom query | `SELECT id FROM users WHERE LOWER(email) = LOWER($1)` | Same pattern as login; consistent case normalization |
| Participant-to-user linking | Separate linking endpoint | Inline UPDATE inside register and redeem handlers | No separate "link accounts" screen needed — linking is automatic and transparent |
| Migration versioning | Custom system | Follow project convention: numbered SQL file in migrations/ | Pattern already established (001 through 011 exist) |

---

## Common Pitfalls

### Pitfall 1: Double-Linking Race Condition at Registration

**What goes wrong:** User redeems magic link (creating participant record with user_id set), then registers an account with the same email. The register handler also tries to link participants. If redemption already set `user_id`, the UPDATE in register is a no-op (user_id already = new user's id). But if the user registers _and_ redeems concurrently (impossible in a single-user mobile app, but worth noting), the UPDATE in register runs first and then redemption overwrites it.

**Why it happens:** Two code paths can both write `participants.user_id`.

**How to avoid:** Both use `UPDATE ... SET user_id = $userId WHERE user_id IS NULL OR user_id = $userId` — or simply use an unconditional UPDATE (idempotent since both would set the same user_id). Not a practical concern for this app given sequential mobile flows.

### Pitfall 2: `redeemMagicLink()` Response Shape Switch

**What goes wrong:** The mobile screen checks `response.user.eventId` after redemption to navigate to the event. When backend returns a user-scoped token, `eventId` is undefined. The navigation `router.replace('/event-details?id=undefined')` causes a 404 or blank screen.

**Why it happens:** `magic-link/[token].tsx` assumes participant-scoped response.

**How to avoid:** Backend MUST include `eventId` as an extra hint field in the user-scoped redeem response body (not in the JWT). Mobile code checks `response.user.eventId ?? null` and falls back to `/(tabs)` when null — but with the hint field present, navigation is unchanged.

**Warning signs:** `router.replace('/event-details?id=undefined')` in logs; blank event details screen.

### Pitfall 3: `GET /api/events` Returns Duplicate Events

**What goes wrong:** A user is both organizer_id on an event AND has a participant record with user_id set on the same event. The query `WHERE organizer_id = $1 OR EXISTS (participants WHERE user_id = $1)` returns the event twice.

**Why it happens:** SQL GROUP BY handles this in the existing query (it already uses `GROUP BY e.id`). Since the query groups by event, duplicates are naturally collapsed.

**How to avoid:** Verify the existing `GROUP BY e.id` remains in the query after adding the OR EXISTS clause. No extra DISTINCT is needed.

**Warning signs:** Events list shows same event card twice.

### Pitfall 4: Email Case Sensitivity

**What goes wrong:** Invite email stored as `Alice@example.com`; user registers as `alice@example.com`. `WHERE email = $email` fails to match.

**Why it happens:** invites.email may have mixed case; users.email is stored lowercase (see `auth.ts` register: `email.toLowerCase()`).

**How to avoid:** In the magic link user lookup and in the register participant-linking query, always compare `LOWER(invites.email) = LOWER($registrationEmail)` — or simply `invites.email = $registrationEmail.toLowerCase()` since user emails are already lowercased at insert.

**Warning signs:** Account linking silently skips despite matching emails.

### Pitfall 5: `invites.email` May Be NULL

**What goes wrong:** Some invites are created without an email (e.g. a bare invite link shared as a URL without email pre-addressing). The user lookup `WHERE email = NULL` returns nothing. But `NULL = NULL` is false in SQL; `invite_email IS NULL` means no linking is possible.

**Why it happens:** `invites.email` is nullable (schema: `email VARCHAR(255)` with no NOT NULL constraint).

**How to avoid:** Guard the user lookup: `if (invite.invite_email) { /* do lookup */ } else { /* skip linking, use participant path */ }`. This is already partially handled since `emailPrefix` derivation in the existing code handles null email with a fallback to "Participant".

### Pitfall 6: `role` Mismatch After Account Linking

**What goes wrong:** A participant who registers becomes a `role='participant'` user (that's the default in register). The `requireOrganizer` middleware blocks them from creating events. This is expected behavior — not a bug — but the events list may show no "Create Event" FAB if the role check is wrong.

**Why it happens:** Default role on registration is `'participant'`. Organizer status is separate from being a registered user.

**How to avoid:** Clarify in plan that linked users remain `role='participant'` unless upgraded separately. No role elevation happens in this phase. The "Create Event" button on the events list should be gated on `user.role === 'organizer'` (already done via `requireOrganizer` on POST /events).

---

## Code Examples

### Schema Migration Pattern (project convention)

```sql
-- Source: apps/api/src/db/schema.sql and migrations/010-add-organizer-id-to-events.sql
ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
```

### User Lookup by Invite Email (magicLink.ts addition)

```typescript
// Source: pattern from apps/api/src/routes/auth.ts login handler
const userLookup = invite.invite_email
  ? await query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [invite.invite_email.toLowerCase()]
    )
  : { rows: [] };

const matchedUser = userLookup.rows[0] ?? null;
```

### Token Branch at Redemption

```typescript
// Source: pattern from apps/api/src/services/tokenService.ts
if (matchedUser) {
  // Link participant to user
  await query('UPDATE participants SET user_id = $1 WHERE id = $2', [matchedUser.id, participantId]);
  // Issue user-scoped tokens
  const { accessToken, refreshToken } = await generateTokens({
    userId: matchedUser.id,
    email: matchedUser.email,
    role: matchedUser.role,
  });
  // ... set cookie, return user-shaped response with eventId hint
} else {
  // No account — issue participant-scoped tokens as before
  const { accessToken, refreshToken } = await generateParticipantTokens({ participantId, eventId, participantName });
  // ... set cookie, return participant-shaped response
}
```

### Post-Registration Participant Linking (auth.ts)

```typescript
// After INSERT INTO users ... RETURNING id
await query(
  `UPDATE participants SET user_id = $1
   WHERE id IN (
     SELECT p.id FROM participants p
     JOIN invites i ON i.participant_id = p.id
     WHERE LOWER(i.email) = $2
       AND i.status = 'accepted'
   )`,
  [user.id, email.toLowerCase()]
);
```

### Extended GET /api/events Query (events.ts)

```typescript
// Replaces the organizer branch WHERE clause
// Source pattern: existing query in apps/api/src/routes/events.ts
result = await query(
  `${baseSelect}
   WHERE e.organizer_id = $1
      OR e.organizer_id IS NULL
      OR EXISTS (
           SELECT 1 FROM participants p2
           WHERE p2.event_id = e.id AND p2.user_id = $1
         )
   GROUP BY e.id
   ORDER BY e.created_at DESC`,
  [user.userId],
);
```

### Mobile: Dual-Shape redeemMagicLink Handler

```typescript
// Source: apps/gatherly-mobile/app/api/auth.ts — modify existing function
async redeemMagicLink(token: string): Promise<AuthResponse> {
  const response = await apiClient.post('/api/auth/magic-link/redeem', { token });
  const data = response.data;

  // User-scoped response (existing account matched)
  if (data.user.id && !data.user.participantId) {
    return {
      accessToken: data.accessToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        eventId: data.user.eventId, // hint field from backend
      },
    };
  }

  // Participant-scoped response (no account — existing behaviour)
  const { participantId, participantName, eventId, eventName, role } = data.user;
  return {
    accessToken: data.accessToken,
    user: {
      id: participantId,
      email: '',
      name: participantName,
      role,
      participantId,
      eventId,
      eventName,
    },
  };
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Magic link always creates participant-scoped session | Magic link checks for existing account first | Phase 27 | Existing users get full account session |
| Registration ignores prior participant records | Registration links accepted invites by email | Phase 27 | User sees their joined events immediately |
| Events list only shows events where user is organizer | Events list also shows events where user has participant record | Phase 27 | Invited registered users see their events |

---

## Open Questions

1. **Should magic link redemption elevate role?**
   - What we know: invites are sent to any email address; the user who registered may have `role='participant'`, which blocks event creation.
   - What's unclear: whether a user who joins via magic link should ever become an `'organizer'`.
   - Recommendation: Do not change role in this phase. Account linking is separate from role management. Document this explicitly in the plan.

2. **What happens when `participants.name` (email prefix) conflicts with `users.name`?**
   - What we know: `participants.name` is derived from the email prefix at invite acceptance time (e.g. "alice" from "alice@example.com"). `users.name` is set at registration ("Alice Smith").
   - What's unclear: whether the events list / participant lists should show the user's full registered name vs the short invite name.
   - Recommendation: Out of scope for this phase. `participants.name` stays as-is; the link is by `user_id` foreign key, not a name merge. Document as a known inconsistency.

3. **Does the `already-joined` check in join.tsx need updating?**
   - What we know: `join.tsx` checks `events.find(e => e.id === String(previewData.eventId))` and `existingEvent.people?.includes(user.name)`. After Phase 27, a registered user who was already linked via magic link will have the event in their list — so `already-joined` detection will work correctly IF the events list is updated.
   - What's unclear: timing — if the user lands on the join screen before `refreshEvents()` fires, the check may not find the event.
   - Recommendation: Not a blocking concern. The join screen already handles this gracefully via the `already-joined` state and `handleJoin` guard. No change needed.

4. **Participants with no invite (manually added by organizer)**
   - What we know: Organizers can add participants by name directly via the edit-event screen (no invite, no email). These participants have no `invites.email` to match against.
   - What's unclear: nothing — these participants simply cannot be auto-linked. `user_id` stays NULL.
   - Recommendation: Correct behavior. Document in plan that only invite-linked participants can be auto-linked.

---

## Sources

### Primary (HIGH confidence)

- `apps/api/src/routes/magicLink.ts` — full source, redemption logic
- `apps/api/src/routes/auth.ts` — full source, register + login + refresh
- `apps/api/src/routes/events.ts` — full source, GET /api/events branching logic
- `apps/api/src/routes/invites.ts` — full source, accept endpoint + email storage
- `apps/api/src/db/schema.sql` — full schema, column definitions + constraints
- `apps/api/src/services/tokenService.ts` — `generateTokens` / `generateParticipantTokens` signatures
- `apps/api/src/middleware/auth.ts` — `req.user` shape, how `participantId` is propagated
- `apps/gatherly-mobile/app/api/auth.ts` — `redeemMagicLink()` response destructuring
- `apps/gatherly-mobile/app/magic-link/[token].tsx` — how `response.user.eventId` is used post-redemption
- `apps/gatherly-mobile/app/join.tsx` — `already-joined` detection, `handleJoin` flow
- `apps/gatherly-mobile/app/_layout.tsx` — `EventsProvider key={session}` remount pattern
- `apps/gatherly-mobile/app/contexts/EventsContext.tsx` — `refreshEvents()` and cache pattern
- `.planning/STATE.md` — locked architectural decisions
- `.planning/ROADMAP.md` — phase 27 key changes specification

### Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all tooling confirmed in source files
- Architecture: HIGH — all patterns sourced directly from codebase files
- Pitfalls: HIGH — derived from reading actual code paths, not speculation
- Open questions: MEDIUM — edge cases identified from code, resolution depends on product decisions

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable codebase; no external dependencies introduced)
