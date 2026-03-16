# Phase 28: Remove Account Roles - Research

**Researched:** 2026-03-16
**Domain:** TypeScript/PostgreSQL — database column removal, JWT payload cleanup, client-side type surgery
**Confidence:** HIGH (all findings from direct codebase inspection)

## Summary

This phase is a surgical removal of the `role` field from the system. The field appears in 7 distinct locations: the PostgreSQL schema, the JWT/TokenPayload type, the Express Request user type, 4 API route files, the tokenService, and 5 mobile/web client files. There are no external library dependencies to research — this is pure codebase surgery on code we own.

The key insight from inspection is that `role` is used in two completely different ways: (1) as a gate for `user.role === "participant"` in `events.ts` to branch query logic, and (2) as `user?.role === "organizer"` in three mobile screens to gate UI elements (organizer-only actions). After removal, the participant branch in `events.ts` is replaced by `user.participantId !== undefined`, and the organizer checks in the mobile screens become `user?.participantId === undefined` (i.e., any registered user is an organizer-capable user).

The `requireOrganizer` middleware already has its role check commented out (it only verifies `req.user` exists). No change needed there beyond removing the comment reference and the docstring mention of `role`.

**Primary recommendation:** Execute in this order — SQL migration first, then TypeScript type removal, then route/service changes, then client cleanup. TypeScript errors after removing `role` from the type will act as a compiler-driven checklist ensuring nothing is missed.

## Standard Stack

No new libraries required. This phase uses only what is already installed.

### Core (existing)
| Tool | Version | Purpose |
|------|---------|---------|
| PostgreSQL | existing | DROP column migration via `ALTER TABLE` |
| jsonwebtoken | existing | JWT signing — payload shape change only |
| TypeScript | existing | Type removal drives compiler-enforced cleanup |

### No New Installations
```bash
# Nothing to install
```

## Architecture Patterns

### Complete Inventory of Role References

Every location requiring a change, verified by grep:

**API — Backend (apps/api/src)**

| File | Line(s) | What it does | Change required |
|------|---------|--------------|----------------|
| `db/schema.sql` | 109 | `role VARCHAR(50) DEFAULT 'participant' CHECK (...)` | Remove column definition |
| `db/migrations/002_add_users_refresh_tokens.sql` | 13 | Same column in migration | Leave as historical record (re-runnable guard not needed — already applied) |
| `services/tokenService.ts` | 6–10 | `TokenPayload` interface has `role` field | Remove field from interface |
| `services/tokenService.ts` | 79–85 | `generateParticipantTokens` hardcodes `role: "participant"` in payload | Remove `role` from payload |
| `middleware/auth.ts` | 12 | Request user type: `role: 'organizer' | 'participant'` | Remove from type declaration |
| `middleware/auth.ts` | 50, 103 | `role: payload.role` spread into `req.user` | Remove both assignments |
| `middleware/requireOrganizer.ts` | 4, 18–21 | Docstring mentions role; commented-out role check | Remove comment block, update docstring |
| `routes/auth.ts` | 70–71 | INSERT includes `role` column and `'participant'` value | Remove from INSERT |
| `routes/auth.ts` | 99, 112 | `role: user.role` in `generateTokens()` calls (register) | Remove `role` from call |
| `routes/auth.ts` | 134 | SELECT includes `role` column (login) | Remove from SELECT |
| `routes/auth.ts` | 158, 171 | `role: user.role` in `generateTokens()` calls (login) | Remove `role` from call |
| `routes/auth.ts` | 241 | `/refresh` hardcodes `role: "participant"` in participant response body | Remove field |
| `routes/auth.ts` | 251 | SELECT includes `role` (refresh for regular user) | Remove from SELECT |
| `routes/auth.ts` | 265, 278 | `role: user.role` in `generateTokens()` (refresh) + response body | Remove both |
| `routes/events.ts` | 56–74 | `if (user.role === "participant")` branches query | Replace with `if (user.participantId !== undefined)` |
| `routes/magicLink.ts` | 230 | SELECT includes `role` | Remove from SELECT |
| `routes/magicLink.ts` | 254 | `role: matchedUser.role` in `generateTokens()` call | Remove |
| `routes/magicLink.ts` | 271 | `role: matchedUser.role` in response body | Remove |
| `routes/magicLink.ts` | 302 | `role: "participant"` in participant response body | Remove |
| `routes/users.ts` | 19 | SELECT includes `role` | Remove from SELECT |
| `routes/users.ts` | 37 | `role: u.role` in response body | Remove |
| `routes/users.ts` | 60 | RETURNING includes `role` | Remove from RETURNING |
| `routes/users.ts` | 73 | `role: u.role` in response body | Remove |

**Mobile App (apps/gatherly-mobile/app)**

| File | Line(s) | What it does | Change required |
|------|---------|--------------|----------------|
| `api/auth.ts` | 85 | `redeemMagicLink` response type has `role: "organizer" | "participant"` | Remove from type |
| `api/auth.ts` | 95 | Participant-scoped shape has `role: "participant"` | Remove from type |
| `api/auth.ts` | 126–132 | Destructures `role` from participant shape | Remove destructure; remove from return if present |
| `api/users.ts` | 7 | `UserProfile` interface has `role: string` | Remove field |
| `api/users.ts` | 18 | `updateMe` return type has `role: string` | Remove field |
| `event-details.tsx` | 369 | `isOrganizer = isCurrentUser && user?.role === "organizer"` | Replace with `isCurrentUser && user?.participantId === undefined` |
| `polls.tsx` | 27 | `isOrganizer = user?.role === "organizer"` | Replace with `user?.participantId === undefined` |
| `rsvp.tsx` | 26 | `isOrganizer = user?.role === "organizer"` | Replace with `user?.participantId === undefined` |

**Legacy Web App (apps/gatherly/src)** — This app appears to be the old React frontend, not the mobile primary client. It also contains role references but the CONTEXT.md says `apps/web` (marketing site) is auth-free. The `apps/gatherly` app has its own auth types that reference `role`.

| File | Line(s) | Change required |
|------|---------|----------------|
| `api/auth.ts` | 7, 23, 74 | `User.role` type field and magic link hardcoded `role: "participant"` | Remove |
| `pages/events/details.tsx` | 34, 54, 71 | Three `user?.role === "participant"` checks | Replace with `user?.participantId !== undefined` |
| `pages/events/index.tsx` | 33 | `user?.role === "participant"` redirect logic | Replace with `user?.participantId !== undefined` |

### SQL Migration Pattern

Migration 013 drops the column. Safe because:
- No CHECK constraint dependencies beyond the column itself
- No FK references to role
- `DEFAULT 'participant'` is on the column being dropped
- Code ships at same time, so no window where column is gone but code still reads it

```sql
-- Migration 013: Remove role column from users
-- Phase 28: All users get full event-creation access via participantId check.
-- Requires JWT_SECRET bump (done via .env change, not SQL).

ALTER TABLE users DROP COLUMN IF EXISTS role;
```

The `IF EXISTS` guard makes it safe to re-apply.

### JWT Secret Bump Pattern

Bumping `JWT_SECRET` and `REFRESH_SECRET` in `.env` invalidates all issued tokens. The `verifyAccessToken` and `verifyRefreshToken` functions will reject all existing tokens because the signature check fails. Users are silently logged out and must re-login. The refresh tokens in the `refresh_tokens` table become orphaned/unusable (they will be rejected at JWT signature verification before the DB lookup even runs). They can remain in the table; `cleanExpiredTokens` will purge them over time.

**Important:** `.env.example` should also have a comment added noting this must be rotated.

### TypeScript-Driven Cleanup Strategy

The correct order:
1. Remove `role` from `TokenPayload` interface in `tokenService.ts`
2. Remove `role` from Express `Request.user` type in `auth.ts`
3. Remove `role` from mobile `User` interface in `api/auth.ts`
4. Run `pnpm check-types` — TypeScript errors now identify every remaining reference
5. Fix each error location (compile errors = exact file + line list)

This is better than manual grep because TypeScript will catch uses inside template strings or dynamic property access that grep misses.

### Replacement Logic for `isOrganizer` Checks

The current pattern:
```typescript
// OLD — role-based
const isOrganizer = user?.role === "organizer";
```

Replacement pattern for all three mobile screens:
```typescript
// NEW — presence of participantId means magic-link-only session
const isOrganizer = user?.participantId === undefined;
```

This works because:
- Registered users: `user` has `id`, `email`, `name` — no `participantId`
- Magic-link participants: `user` has `participantId`, `eventId`, `eventName`
- The `User` type in `api/auth.ts` already has `participantId?: number` as optional

For `events.ts` backend route:
```typescript
// OLD
if (user.role === "participant") {
  // magic-link participant — see only their event
}

// NEW
if (user.participantId !== undefined) {
  // magic-link participant — see only their event
}
```

### Response Body Cleanup

Several API responses return `role` in the JSON body to the client. After removal:
- `/api/auth/register` → stop returning `role` in user object
- `/api/auth/login` → stop returning `role` in user object
- `/api/auth/refresh` → stop returning `role` in user object (both user and participant paths)
- `/api/auth/magic-link/redeem` → stop returning `role` in response body
- `/api/users/me` → stop returning `role`
- `/api/users/me` (PUT) → stop returning `role`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Finding all role references | Manual file-by-file review | TypeScript compiler errors after type removal |
| Token invalidation | Revoke individual tokens from DB | Bump JWT_SECRET — all existing tokens fail signature check |
| Gradual migration / soft transition | Feature flags, dual-read logic | Not needed — clean break per CONTEXT.md decision |

## Common Pitfalls

### Pitfall 1: Missing the Legacy `apps/gatherly` Web App
**What goes wrong:** The `apps/gatherly-mobile` is the primary client but `apps/gatherly` (old React frontend) also has role references. If only the mobile app is cleaned, TypeScript in `apps/gatherly` still has `role` on the User type, causing confusion.
**Why it happens:** There are two separate frontend apps with separate `api/auth.ts` files, each defining their own `User` interface with `role`.
**How to avoid:** Run `pnpm check-types` from the repo root to catch both apps.
**Warning signs:** TypeScript passing in one app but not the other.

### Pitfall 2: Refresh Endpoint Returns Hardcoded `role: "participant"`
**What goes wrong:** The `/refresh` endpoint (auth.ts:241) returns a hardcoded `role: "participant"` in the participant token refresh path — this is in the **response body**, not just the JWT payload. It will be missed if only searching for `user.role`.
**Why it happens:** It is a string literal, not a variable reference — grep for `user.role` misses it.
**How to avoid:** Search for `role: "participant"` and `role: "organizer"` as string literals, not just `user.role`.

### Pitfall 3: `tokenService.ts` `generateParticipantTokens` Still Embeds Role
**What goes wrong:** The participant token payload builder hardcodes `role: "participant"` at line 82. Even after removing `role` from `TokenPayload`, this will become a TypeScript error that prompts removal — but the JWT payload field must also be removed from `generateTokens` call sites where `role: user.role` is currently passed.
**Why it happens:** Role is embedded in the JWT payload itself, not just the response body.
**How to avoid:** Remove `role` from `TokenPayload` type first; TypeScript errors will surface all JWT generation call sites.

### Pitfall 4: `requireOrganizer` Middleware Has Dead Code
**What goes wrong:** The role check in `requireOrganizer.ts` is already commented out. The comment block (lines 18–21) and the docstring mention of `'organizer' role` remain. These are misleading but not bugs. They should be cleaned up but aren't functional issues.
**How to avoid:** Update the docstring and remove the commented-out block as part of this phase.

### Pitfall 5: `UserProfile` in `apps/gatherly-mobile/app/api/users.ts` Returns `role`
**What goes wrong:** The `GET /api/users/me` endpoint currently returns `role` in the response, and the mobile `UserProfile` type includes `role: string`. The profile screen (`(tabs)/profile.tsx`) does NOT currently display role — but it imports `UserProfile`. Removing `role` from the response without updating the type causes a shape mismatch that TypeScript will catch.
**How to avoid:** Remove `role` from `UserProfile` interface in `users.ts` at the same time as the API route change.

### Pitfall 6: `auth.ts` in Mobile `redeemMagicLink` Destructures `role`
**What goes wrong:** In `apps/gatherly-mobile/app/api/auth.ts` at line 126, `role` is destructured from the participant response shape but then NOT used in the return object (lines 134–144). The variable is unused after destructuring. After removing the type, TypeScript will error on the destructure — it needs to be removed.
**Why it happens:** The variable was extracted but the return object intentionally omits it (because `User` interface already doesn't have `role` in the mobile version — confirmed by reading the file).
**How to avoid:** Simply remove `role` from the destructure at line 126.

## Code Examples

### events.ts — Replacing the Role Gate
```typescript
// Source: direct inspection of apps/api/src/routes/events.ts:56
// BEFORE:
if (user.role === "participant") {
  result = await query(
    `${baseSelect} WHERE e.id = $1 GROUP BY e.id ORDER BY e.created_at DESC`,
    [user.eventId],
  );
} else {
  // organizer path...
}

// AFTER:
if (user.participantId !== undefined) {
  result = await query(
    `${baseSelect} WHERE e.id = $1 GROUP BY e.id ORDER BY e.created_at DESC`,
    [user.eventId],
  );
} else {
  // registered user path...
}
```

### TokenPayload — After Removal
```typescript
// Source: direct inspection of apps/api/src/services/tokenService.ts
// AFTER — role removed:
export interface TokenPayload {
  userId: number;
  email: string;
  participantId?: number;
  eventId?: number;
}
```

### Express Request User Type — After Removal
```typescript
// Source: direct inspection of apps/api/src/middleware/auth.ts
// AFTER — role removed:
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        participantId?: number;
        eventId?: number;
      };
    }
  }
}
```

### SQL Migration 013
```sql
-- 013-remove-role-from-users.sql
-- Phase 28: Remove role column — all registered users have full access.
-- Deploy with JWT_SECRET and REFRESH_SECRET rotation to force re-login.

ALTER TABLE users DROP COLUMN IF EXISTS role;
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `role` field gates event creation | Presence of `participantId` gates participant-only access | Simpler; no two-tier user model |
| `user.role === "organizer"` for UI | `user.participantId === undefined` for UI | Same semantic, no DB column needed |

**Deprecated after this phase:**
- `role` column: dropped from `users` table
- `TokenPayload.role` field: removed from JWT claims
- `User.role` field: removed from all TypeScript types in API and mobile

## Open Questions

1. **`apps/gatherly` legacy web app scope**
   - What we know: It has `role` in `api/auth.ts` and `pages/events/details.tsx` and `pages/events/index.tsx`
   - What's unclear: The CONTEXT.md says only `apps/web` (marketing site) is auth-free. The `apps/gatherly` app is the old React frontend; it is unclear if it is actively deployed or just legacy.
   - Recommendation: Include it in the sweep regardless — it's in the monorepo and `pnpm check-types` will enforce cleanup. The changes are low-risk (same pattern as mobile).

2. **`refresh_tokens` table orphaned rows after secret bump**
   - What we know: After bumping `JWT_SECRET`, all refresh tokens in the DB are cryptographically invalid (signature check fails before DB lookup). The rows remain in the table until `cleanExpiredTokens` runs.
   - What's unclear: Whether to add a migration step that `TRUNCATE refresh_tokens` for a clean slate.
   - Recommendation: Optionally add `TRUNCATE refresh_tokens;` to migration 013. Not strictly required since they'll be rejected anyway, but cleaner. Document in migration comment.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings read from source files
  - `apps/api/src/middleware/auth.ts` — Express user type and JWT verification
  - `apps/api/src/middleware/requireOrganizer.ts` — already-commented role check
  - `apps/api/src/services/tokenService.ts` — TokenPayload definition, token generation
  - `apps/api/src/routes/auth.ts` — 6 occurrences of `role` across register/login/refresh
  - `apps/api/src/routes/events.ts` — the one active role gate (`user.role === "participant"`)
  - `apps/api/src/routes/magicLink.ts` — 4 occurrences in redeem path
  - `apps/api/src/routes/users.ts` — 4 occurrences in profile endpoints
  - `apps/api/src/db/schema.sql` — column definition
  - `apps/gatherly-mobile/app/api/auth.ts` — User type and redeemMagicLink shape
  - `apps/gatherly-mobile/app/api/users.ts` — UserProfile type
  - `apps/gatherly-mobile/app/event-details.tsx` — isOrganizer UI gate
  - `apps/gatherly-mobile/app/polls.tsx` — isOrganizer UI gate
  - `apps/gatherly-mobile/app/rsvp.tsx` — isOrganizer UI gate
  - `apps/gatherly/src/api/auth.ts` — legacy web User type
  - `apps/gatherly/src/pages/events/details.tsx` — 3 role checks
  - `apps/gatherly/src/pages/events/index.tsx` — 1 role check

## Metadata

**Confidence breakdown:**
- Complete role inventory: HIGH — verified by grep across entire codebase
- SQL migration pattern: HIGH — verified against existing schema.sql and migration files
- Replacement logic (`participantId !== undefined`): HIGH — confirmed by reading CONTEXT.md decision + existing Phase 27 dual-shape detection pattern in auth.ts
- No tests found asserting on role: HIGH — grep found zero test files referencing `role`

**Research date:** 2026-03-16
**Valid until:** N/A — this is internal codebase research, not external library research. Valid until code changes.
