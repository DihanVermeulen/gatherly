# Phase 28: Remove Account Roles - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove `role` from the `users` table, JWT payload, and TypeScript types. Replace the one remaining `role`-based gate (`user.role === "participant"` in events.ts) with `user.participantId !== undefined`. All registered users can create events immediately after this change. No new UI.

</domain>

<decisions>
## Implementation Decisions

### Token transition
- Force re-login for all existing users — bump JWT_SECRET to invalidate all existing tokens
- Refresh tokens (HttpOnly cookies) are also JWT-signed — they become invalid automatically with the secret bump
- No soft transition window; clean break is preferred
- Documenting the secret bump in deployment docs is ops responsibility, not in scope for the plan

### Migration safety
- Drop `role` column immediately in one migration (migration 013) — no nullable/deprecation window
- SQL migration + code removal in the same plan — they ship together atomically
- No intermediate state where DB has no column but code still references it (or vice versa)

### New registrations
- Registration flow unchanged — same fields (name, email, password), same UX
- All registered users get full event-creation access automatically once the gate is removed
- No onboarding prompt or role selection added
- Existing `role = 'participant'` users in DB get full access silently — no data migration, just drop the column

### Client-side cleanup
- Full sweep: remove ALL `user.role` references across API and mobile app
- Remove `role` from TypeScript user type entirely (not optional) — TypeScript errors force complete cleanup
- Web marketing site (apps/web) is auth-free; no role cleanup needed there

### Claude's Discretion
- Exact grep/search strategy for finding all role references in the codebase
- Order of changes within the single plan (SQL first vs code first)
- How to handle any role references found in tests

</decisions>

<specifics>
## Specific Ideas

- JWT_SECRET bump is the mechanism for forcing re-login — no code change needed, just an env var rotation
- Removing `role` from the TypeScript type is the "hammer" that surfaces every remaining reference as a compile error, ensuring nothing is missed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-remove-account-roles*
*Context gathered: 2026-03-12*
