# Phase 34: Infrastructure - Research

**Researched:** 2026-03-27
**Domain:** API tier enforcement, TypeScript type correction, route stubs
**Confidence:** HIGH — all findings from direct code inspection of the live codebase

## Summary

Phase 34 requires five surgical changes across two files on the API side and one file on the mobile side. The changes fall cleanly into two plan files: Plan 01 handles the type fix, RSVP gate removal, and upgrade route stub; Plan 02 handles participant cap and trial limits. All code paths are fully mapped below with exact line numbers.

The codebase is in a consistent state: the API already returns `plan_tier` from the DB as `'free'` (with a `|| 'free'` fallback), the mobile type says `'free' | 'standard'` (wrong — must become `'free' | 'premium'`), and no enforcement checks exist yet for participant caps or trial limits on potluck categories/polls.

**Primary recommendation:** Make all five changes exactly as specified. No new tables, no migrations, no new middleware files needed. All enforcement fits inline in the existing route handlers.

---

## Plan 01 Findings: Type Fix + RSVP Gate Removal + Upgrade Route Stub

### INFRA-01: TEvent.planTier type fix

**File:** `apps/gatherly-mobile/app/api/events.ts`
**Line 44 (current):**
```typescript
planTier?: 'free' | 'standard';
```
**Must become:**
```typescript
planTier?: 'free' | 'premium';
```

**Downstream consumers of planTier in mobile (all use `=== "free"` comparisons — no change needed):**
- `apps/gatherly-mobile/app/modules-config.tsx` line 125-126: `planTier === "free"` — safe, no change
- `apps/gatherly-mobile/app/potluck-setup.tsx` line 502: `=== "free"` — safe, no change

**API side (already correct):** `apps/api/src/routes/events.ts` returns `planTier: row.plan_tier || 'free'` on all 3 fetch paths (GET list line 93, GET single line 221, `fetchEventById` helper line 907). The DB column only stores `'free'` or `'premium'` — the `'standard'` value was never in the DB schema, only in the TypeScript type definition.

---

### INFRA-04: RSVP plan_tier check removal

**Finding:** There is NO plan_tier check on any RSVP endpoint in `apps/api/src/routes/modules.ts`. Search of the entire modules.ts confirms:

- Line 9: `const PREMIUM_MODULES = ["polls", "potluck", "rsvp", "white_elephant"];` — `rsvp` appears in the PREMIUM_MODULES constant
- Lines 63-67: The `PREMIUM_MODULES` check fires only in `PUT /:id/modules` (the module toggle endpoint), NOT on the RSVP read/write endpoints

**The RSVP endpoints (lines 319-392) have no plan_tier gate.** However, `rsvp` is in the `PREMIUM_MODULES` array (line 9), which means toggling RSVP on via `PUT /:id/modules` is gated for free events. INFRA-04 requires removing `rsvp` from `PREMIUM_MODULES`.

**Required change in `apps/api/src/routes/modules.ts` line 9:**
```typescript
// Current:
const PREMIUM_MODULES = ["polls", "potluck", "rsvp", "white_elephant"];

// Must become:
const PREMIUM_MODULES = ["polls", "potluck", "white_elephant"];
```

This is the only change needed for INFRA-04. No RSVP endpoint code changes required.

---

### INFRA-05: Upgrade route stub

**No existing PATCH routes in the codebase.** The codebase uses PUT for updates. The new PATCH route must be added to `apps/api/src/routes/events.ts`.

**Route registration:** `apps/api/src/server.ts` line 48 mounts `eventsRouter` at `/api/events`. So adding `router.patch('/:id/upgrade', ...)` in `events.ts` yields `PATCH /api/events/:id/upgrade`.

**Auth pattern to follow (from existing routes):**
- `authenticateJWT` middleware
- `requireOrganizer` middleware
- Check ownership via `organizer_id = userId` in the query (same as DELETE at line 418-421)

**Return shape:** Must return the updated event. The existing `fetchEventById(id)` helper (line 820-915 in `events.ts`) already fetches and formats the full event shape including `planTier`. Use it.

**The route stub:**
```typescript
// PATCH /api/events/:id/upgrade — upgrade event plan tier to premium
router.patch(
  "/:id/upgrade",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      "UPDATE events SET plan_tier = 'premium' WHERE id = $1 AND organizer_id = $2 RETURNING id",
      [id, (req as any).user.userId],
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedEvent = await fetchEventById(id);
    res.json(updatedEvent);
  }),
);
```

**Idempotency:** Setting `plan_tier = 'premium'` unconditionally is already idempotent — repeated calls are safe.

**Placement:** Add before the `fetchEventById` helper function, after the existing DELETE route (line 429). The helper must already exist in the file for reference — it does (line 820).

---

## Plan 02 Findings: Participant Cap + Trial Limits

### INFRA-02: Participant cap enforcement (3 insertion paths)

**Cap value:** 20 participants for free events.
**Error contract:** `HTTP 403 { error: 'participant_cap_reached', limit: 20 }`

#### Path 1: POST /api/events/:id/participants (events.ts lines 432-455)

Current code at lines 445-448 does a bare INSERT with `ON CONFLICT DO NOTHING`. No cap check exists.

**Must add before the INSERT:**
```typescript
// Check plan tier and participant count
const eventCheck = await query(
  "SELECT plan_tier FROM events WHERE id = $1",
  [id],
);
const planTier = eventCheck.rows[0]?.plan_tier || 'free';
if (planTier === 'free') {
  const countResult = await query(
    "SELECT COUNT(*)::int AS count FROM participants WHERE event_id = $1",
    [id],
  );
  if (countResult.rows[0].count >= 20) {
    return res.status(403).json({ error: 'participant_cap_reached', limit: 20 });
  }
}
```

**Gotcha:** The ownership check (`ownerCheck` query at line 442) already confirms the event exists and the user owns it. The plan_tier query can reuse the same query with `SELECT id, plan_tier FROM events WHERE id = $1 AND organizer_id = $2` — combines the two queries into one.

#### Path 2: PUT /api/events/:id people sync (events.ts lines 311-338)

Current code at lines 320-327 loops over `people` array and inserts each new participant with no cap check.

**Location for cap check:** Inside the `if (people !== undefined)` block (line 311), before the insertion loop (line 320). The event's plan_tier is available in the DB but not fetched in the PUT handler currently — must add a query inside the transaction.

**Must add after the `currentNames` computation (around line 317) and before the insertion loop:**
```typescript
// Enforce participant cap for free events
const eventTierResult = await client.query(
  "SELECT plan_tier FROM events WHERE id = $1",
  [id],
);
const eventPlanTier = eventTierResult.rows[0]?.plan_tier || 'free';
if (eventPlanTier === 'free') {
  const newPeopleCount = people.filter((p: string) => !currentNames.includes(p)).length;
  if (currentNames.length + newPeopleCount > 20) {
    await client.query("ROLLBACK");
    return res.status(403).json({ error: 'participant_cap_reached', limit: 20 });
  }
}
```

**Note:** This path is inside a transaction (started at line 283). Must ROLLBACK before returning 403.

#### Path 3: Magic-link redemption (magicLink.ts POST /redeem, lines 110-303)

The "first-time use" branch (lines 173-212) inserts a new participant at lines 190-195. No cap check exists.

**Location for cap check:** Inside the `else` block (line 172), inside the transaction, after `BEGIN` (line 176) and before the INSERT (line 190-195).

**Must add after `BEGIN`:**
```typescript
// Check participant cap for free events
const eventTierCheck = await client.query(
  "SELECT plan_tier FROM events WHERE id = $1",
  [invite.event_id],
);
const tierForCap = eventTierCheck.rows[0]?.plan_tier || 'free';
if (tierForCap === 'free') {
  const capCheck = await client.query(
    "SELECT COUNT(*)::int AS count FROM participants WHERE event_id = $1",
    [invite.event_id],
  );
  if (capCheck.rows[0].count >= 20) {
    await client.query("ROLLBACK");
    client.release();
    return res.status(403).json({ error: 'participant_cap_reached', limit: 20 });
  }
}
```

**Gotcha:** The `client` is declared in an outer scope (line 174) and `client.release()` is called in the `finally` block (line 211). If we return early after ROLLBACK inside the try block, `finally` still runs and calls `client.release()` — that's fine for node-postgres (release is idempotent). But we must NOT call `client.release()` manually before the return; the finally block handles it.

**Second redemption path (returning participant, lines 159-171):** This path reuses an existing participant record — no new participant is created. No cap check needed here.

---

### INFRA-03: Trial limits enforcement

**Error contract:** `HTTP 403 { error: 'trial_limit_reached', limit: N, resource: string }`

#### Potluck categories (max 3 for free events)

**File:** `apps/api/src/routes/modules.ts`
**Route:** `POST /:id/potluck/categories` (lines 424-480)

Current code at lines 446-450 computes `sortOrder` but has no limit check.

**Must add before the `sortOrder` query (before line 446):**
```typescript
// Enforce potluck category trial limit for free events
const eventTierResult = await query(
  "SELECT plan_tier FROM events WHERE id = $1",
  [id],
);
const eventPlanTier = eventTierResult.rows[0]?.plan_tier || 'free';
if (eventPlanTier === 'free') {
  const catCountResult = await query(
    "SELECT COUNT(*)::int AS count FROM module_potluck_categories WHERE event_id = $1",
    [id],
  );
  if (catCountResult.rows[0].count >= 3) {
    return res.status(403).json({ error: 'trial_limit_reached', limit: 3, resource: 'potluck_categories' });
  }
}
```

**Note:** This route does not use a transaction for the INSERT (it's a plain `query` call at line 452). No ROLLBACK needed. The ownership check is done by `requireOrganizer` middleware — the event existence is guaranteed if the middleware passes AND the event owns the module (but the module check is not done in this route — only the categories table insertion is checked). Safe to add the limit check inline.

#### Polls (max 1 for free events)

**File:** `apps/api/src/routes/modules.ts`
**Route:** `POST /:id/polls` (lines 170-241)

Current code at lines 186-193 checks if the polls module is enabled. No limit check on count.

**Must add after the module existence check (after line 193), before the transaction:**
```typescript
// Enforce poll trial limit for free events
const eventTierResult = await query(
  "SELECT plan_tier FROM events WHERE id = $1",
  [id],
);
const eventPlanTier = eventTierResult.rows[0]?.plan_tier || 'free';
if (eventPlanTier === 'free') {
  const pollCountResult = await query(
    "SELECT COUNT(*)::int AS count FROM module_polls WHERE event_id = $1",
    [id],
  );
  if (pollCountResult.rows[0].count >= 1) {
    return res.status(403).json({ error: 'trial_limit_reached', limit: 1, resource: 'polls' });
  }
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Transaction rollback before 403 | Custom wrapper | Inline `await client.query("ROLLBACK")` then return, let `finally` call `client.release()` |
| Event ownership check on upgrade route | New middleware | Inline `WHERE id = $1 AND organizer_id = $2`, check `rowCount === 0` returns 403 |
| Event shape on upgrade response | Custom serializer | Reuse existing `fetchEventById(id)` helper already in events.ts |

---

## Common Pitfalls

### Pitfall 1: Double-release of DB client in magicLink.ts

**What goes wrong:** If you call `client.release()` explicitly before a `return` inside the `try` block, the `finally` clause at line 211 calls it again — this is safe for node-postgres (it logs a warning but doesn't crash), but it's sloppy.
**How to avoid:** Only return after ROLLBACK inside the `try` block. The `finally` handles release.

### Pitfall 2: PUT /events/:id participant sync counts CURRENT participants, not total after merge

**What goes wrong:** The cap check must account for `currentNames.length + newAdditions`, not just `people.length`. A sync could be removing 5 and adding 3 — the net count after would be below cap even if `people.length` > 20.
**How to avoid:** Compute `newPeopleCount = people.filter(p => !currentNames.includes(p)).length` then check `currentNames.length + newPeopleCount > 20`.

### Pitfall 3: RSVP still blocked by module toggle gate after INFRA-04

**What goes wrong:** Removing `rsvp` from `PREMIUM_MODULES` means a free event can now toggle the RSVP module on. This is correct per the requirement. But if existing free events have RSVP not yet in their `event_modules` table, they'll need to enable it first via `PUT /modules`. This is expected behavior — the requirement is that RSVP endpoints don't 403, not that RSVP is auto-enabled.
**How to avoid:** No code change needed beyond the array edit. Document in plan that RSVP must be explicitly enabled per event.

### Pitfall 4: fetchEventById is a file-scoped function, not exported

**What goes wrong:** The `fetchEventById` helper (line 820 of events.ts) is defined as a plain `async function` in module scope — it's available to use in the new PATCH route because the route is added to the same file. Do not try to import it.
**How to avoid:** Add the PATCH route in events.ts before the `fetchEventById` declaration or after it — both work since function declarations are hoisted; this is an async function expression so it must be AFTER line 820, or restructure. Actually it's declared as `async function fetchEventById` (function declaration style) at line 820 — function declarations ARE hoisted in JS, so placement doesn't matter.

---

## Code Examples

### Pattern: Combining ownership check with plan_tier fetch (POST /participants)

```typescript
// Combined query: ownership check + plan_tier in one round-trip
const ownerCheck = await query(
  "SELECT id, plan_tier FROM events WHERE id = $1 AND organizer_id = $2",
  [id, (req as any).user.userId],
);
if (ownerCheck.rows.length === 0) return res.status(403).json({ error: "Forbidden" });
const planTier = ownerCheck.rows[0].plan_tier || 'free';
```

### Pattern: PATCH route with ownership guard and fetchEventById

```typescript
router.patch(
  "/:id/upgrade",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
      "UPDATE events SET plan_tier = 'premium' WHERE id = $1 AND organizer_id = $2 RETURNING id",
      [id, (req as any).user.userId],
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const updatedEvent = await fetchEventById(id);
    res.json(updatedEvent);
  }),
);
```

---

## State of the Art

| Requirement | Current State | Required State |
|-------------|---------------|----------------|
| TEvent.planTier type | `'free' \| 'standard'` (line 44, events.ts mobile) | `'free' \| 'premium'` |
| Participant cap | Not enforced (any count allowed) | 403 at 21st on free events |
| Potluck category limit | Not enforced | 403 at 4th on free events |
| Poll limit | Not enforced | 403 at 2nd on free events |
| RSVP in PREMIUM_MODULES | Yes (line 9, modules.ts) | Removed |
| Upgrade route | Does not exist | `PATCH /api/events/:id/upgrade` |

---

## Open Questions

1. **Mobile error handling for `participant_cap_reached` and `trial_limit_reached`**
   - What we know: These error codes do not yet exist in the mobile codebase (grep confirms no references)
   - What's unclear: Phase 34 success criteria says the API must return these codes — the mobile error handling is presumably built in a later phase
   - Recommendation: Plan 02 delivers the API side only; mobile error display is deferred

2. **Should the participant cap apply to the "returning participant" path in magicLink.ts?**
   - What we know: The returning path (lines 159-171) reuses an existing participant record, adding no new row
   - Recommendation: No cap check needed on the returning path — count does not increase

3. **Does the upgrade route need to auto-insert premium modules?**
   - What we know: The requirements only say `plan_tier = 'premium'` and return updated event — no mention of auto-enabling modules
   - Recommendation: Stub route only sets plan_tier, no module side effects

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `apps/gatherly-mobile/app/api/events.ts` — TEvent type at line 44
- Direct file inspection: `apps/api/src/routes/events.ts` — all participant insertion paths, fetchEventById helper, response shapes
- Direct file inspection: `apps/api/src/routes/modules.ts` — PREMIUM_MODULES array, potluck category route, poll route, RSVP routes
- Direct file inspection: `apps/api/src/routes/magicLink.ts` — redeem endpoint participant creation path
- Direct file inspection: `apps/api/src/server.ts` — route mounting, confirms upgrade route goes in events.ts

### Secondary (MEDIUM confidence)
- Grep scan: `planTier|plan_tier|standard` across all mobile .ts/.tsx files — confirms only 3 consumer locations, all use `=== "free"` (no `=== "standard"` comparisons that would need fixing)
- Grep scan: `upgrade_required|participant_cap|trial_limit` across mobile — confirms no existing error handling for new codes (correct, mobile handling is deferred)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed, all changes are SQL + Express handler edits
- Architecture: HIGH — patterns confirmed from existing code in same files
- Pitfalls: HIGH — derived from reading actual transaction flow in magicLink.ts and the PUT sync logic

**Research date:** 2026-03-27
**Valid until:** Stable — these are implementation files, not external APIs
