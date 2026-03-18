# Phase 30: Infrastructure — Migration and API - Research

**Researched:** 2026-03-18
**Domain:** PostgreSQL migrations, Express/TypeScript API patterns, race-condition-safe signups
**Confidence:** HIGH

## Summary

Phase 30 is a pure backend phase that locks the database schema and API surface area that Phases 31–33 will build against. There is no new library to install and no frontend work. The research focus is on: (1) the correct PostgreSQL approach to the potluck signup race condition, (2) the right SQL column types for the new fields, (3) how to structure the potluck routes alongside the existing modules.ts pattern, and (4) refactoring the users PUT endpoint from positional to patch-style without breaking callers.

The codebase is well-understood from source inspection. All patterns are established: `asyncHandler`, `getClient()` for transactions, `requireOrganizer` middleware, and the modules router registered under `/api/events`. The next migration number is `014-phase30-v22.sql` (migrations 011–013 are already applied).

**Primary recommendation:** Add potluck routes directly to `modules.ts` (consistent with polls and RSVP). Use `JSONB` for `interests` and `suggestion_chips`. Implement the signup race guard with a transaction-level row count check rather than a UNIQUE constraint alone, because quantity > 1 is possible.

---

## Standard Stack

No new libraries are needed. This phase uses only what is already installed.

### Core (already in project)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PostgreSQL | ≥14 (project standard) | Relational DB, JSONB, transactions | Already in use |
| Express + TypeScript | In use | Route handlers | Established pattern |
| `pg` (node-postgres) | In use | `query()` + `getClient()` helpers | Established pattern |

### No new installations needed

All work uses the existing `query()` and `getClient()` helpers from `apps/api/src/db/connection.ts` and the existing middleware chain.

---

## Architecture Patterns

### Recommended Project Structure (relevant files only)

```
apps/api/src/
├── db/
│   └── migrations/
│       └── 014-phase30-v22.sql       # new migration
├── routes/
│   ├── modules.ts                    # extend with potluck routes
│   └── users.ts                      # refactor PUT /me
└── server.ts                         # no changes needed
```

### Pattern 1: Migration Style

**What:** Every migration wraps DDL in `BEGIN`/`COMMIT` and uses `IF NOT EXISTS` on all column additions for idempotency. File numbering is sequential; the next number is `014`.

**Example from existing migration 011:**
```sql
-- Source: apps/api/src/db/migrations/011-phase25-modules-polls-rsvp.sql
BEGIN;

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date TIMESTAMP DEFAULT NULL;

CREATE TABLE IF NOT EXISTS event_modules (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ...
  UNIQUE(event_id, module_type)
);

COMMIT;
```

**When to use:** Every migration in this project follows this pattern.

### Pattern 2: Route Handler in modules.ts

**What:** Potluck routes slot into `modules.ts` exactly like polls and RSVP already do. The router is registered in `server.ts` as `.use("/api/events", modulesRouter)` — so route paths in the file begin with `/:id/potluck/...`.

**Example (existing pattern from modules.ts polls):**
```typescript
// Source: apps/api/src/routes/modules.ts
router.post(
  "/:id/polls",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    // plan tier check first
    const eventResult = await query("SELECT plan_tier FROM events WHERE id = $1", [id]);
    if (eventResult.rows[0].plan_tier === 'free') {
      return res.status(403).json({ error: "upgrade_required" });
    }
    // ... business logic
  }),
);
```

### Pattern 3: Transaction with Race Guard for Potluck Signups

**What:** Potluck categories have a `quantity` field (e.g., "bring 3 side dishes"). The UNIQUE constraint alone does not protect against overbooking when `quantity > 1`. The race guard requires a transaction that locks the category row, counts existing signups, and only inserts if `count < quantity`.

**Why not UNIQUE alone:** A UNIQUE constraint prevents one participant from signing up twice for the same category, but does not limit total signups to the category's `quantity`. For `quantity=1`, a UNIQUE(category_id, participant_id) would suffice only if a participant could not sign up multiple times — but quantity semantics require comparing signup count to quantity.

**Correct pattern:**
```typescript
// Source: direct analysis of CONTEXT.md race condition requirement + PostgreSQL docs
const client = await getClient();
try {
  await client.query("BEGIN");

  // Lock the category row to prevent concurrent inserts
  const catResult = await client.query(
    "SELECT quantity FROM module_potluck_categories WHERE id = $1 AND event_id = $2 FOR UPDATE",
    [catId, id]
  );
  if (catResult.rows.length === 0) {
    await client.query("ROLLBACK");
    return res.status(404).json({ error: "Category not found" });
  }
  const { quantity } = catResult.rows[0];

  // Count existing signups
  const countResult = await client.query(
    "SELECT COUNT(*) as count FROM module_potluck_signups WHERE category_id = $1",
    [catId]
  );
  const currentCount = parseInt(countResult.rows[0].count, 10);

  if (currentCount >= quantity) {
    await client.query("ROLLBACK");
    return res.status(409).json({ error: "slot_taken", message: "Slot just taken" });
  }

  // Safe to insert
  const signup = await client.query(
    "INSERT INTO module_potluck_signups (category_id, event_id, participant_id, participant_name) VALUES ($1, $2, $3, $4) RETURNING *",
    [catId, id, participantId, participantName]
  );

  await client.query("COMMIT");
  return res.status(201).json({ /* signup shape */ });
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
}
```

**Key:** `SELECT ... FOR UPDATE` on the category row serializes concurrent signup attempts at the database level. This is the correct PostgreSQL approach — no application-level retry or external lock needed.

### Pattern 4: Patch-Style Users PUT

**What:** The current `PUT /api/users/me` only accepts `{ name: string }`. The refactored version must accept a partial patch object with `name`, `bio`, `interests`, `avatarUrl`, `onboardingComplete`. Fields not present in the body are left unchanged. `null` explicitly clears the column. The `onboardingComplete` field is one-way: once true, the server ignores attempts to set it back to false.

**Current code (to replace):**
```typescript
// Source: apps/api/src/routes/users.ts (current state)
const { name } = req.body;
if (!name || !name.trim()) {
  return res.status(400).json({ error: "Name is required" });
}
await query("UPDATE users SET name = $1 WHERE id = $2 ...", [name.trim(), user.userId]);
```

**New approach — dynamic UPDATE building:**
```typescript
// Build SET clause dynamically from provided fields only
const updates: string[] = [];
const values: any[] = [];
let paramIdx = 1;

if (body.name !== undefined) {
  updates.push(`name = $${paramIdx++}`);
  values.push(body.name === null ? null : body.name.trim());
}
if (body.bio !== undefined) {
  updates.push(`bio = $${paramIdx++}`);
  values.push(body.bio);
}
if (body.interests !== undefined) {
  updates.push(`interests = $${paramIdx++}`);
  values.push(JSON.stringify(body.interests));  // stored as JSONB
}
if (body.avatarUrl !== undefined) {
  updates.push(`avatar_url = $${paramIdx++}`);
  values.push(body.avatarUrl);
}
if (body.onboardingComplete !== undefined && body.onboardingComplete === true) {
  // One-way: only allow setting to true
  updates.push(`onboarding_complete = $${paramIdx++}`);
  values.push(true);
}

if (updates.length === 0) {
  return res.status(400).json({ error: "No fields to update" });
}

updates.push(`updated_at = NOW()`);
values.push(user.userId);

await query(
  `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING id, email, name, bio, interests, avatar_url, onboarding_complete`,
  values
);
```

### Pattern 5: hasCoverPhoto Flag on Events List

**What:** The events list endpoint already does a big aggregating query. Adding `hasCoverPhoto` means checking whether `cover_photo` IS NOT NULL in the SELECT, not returning the URL value itself.

**Change to existing SELECT in events.ts:**
```sql
-- Source: analysis of apps/api/src/routes/events.ts baseSelect
-- Add to the SELECT list:
(e.cover_photo IS NOT NULL) as has_cover_photo
```

Then in the `events.rows.map()`:
```typescript
hasCoverPhoto: row.has_cover_photo || false,
```

The event **detail** endpoint (`GET /api/events/:id`) uses `SELECT * FROM events` so `cover_photo` is already available — just add `coverPhotoUrl: event.cover_photo || null` to the response shape.

The `PUT /api/events/:id` already uses a partial update pattern with `COALESCE` — adding `cover_photo` follows the same CASE/COALESCE pattern used for other nullable columns.

### Anti-Patterns to Avoid

- **Returning signup count in category response:** The CONTEXT.md decision locks category response to `{ id, eventId, name, quantity, foodImageUrl, suggestionChips, createdAt }` — no embedded signups list. GET categories and GET signups are separate calls.
- **Using ON CONFLICT DO NOTHING for the 409 race guard:** This would silently drop the insert and return 200 instead of 409, violating the contract. Use the `SELECT FOR UPDATE` + count approach.
- **Storing interests as `TEXT[]`:** The CONTEXT.md specifically notes "JSONB array recommended." Requirement INFRA-05 shows `interests TEXT[]` as column name hint but the CONTEXT says JSONB. Use `JSONB` for consistent handling with `feature_flags` and `suggestion_chips`.
- **Adding a separate router file for potluck:** The instruction under Claude's Discretion is "extend modules.ts vs new potluck.ts." Given polls + RSVP are already in modules.ts and potluck is the same module tier, extend modules.ts to keep the file structure consistent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race-safe capacity check | Custom in-memory lock or retry loop | PostgreSQL `SELECT FOR UPDATE` inside transaction | DB-level serialization is correct and simple |
| Dynamic SQL UPDATE | String concatenation or ORM | Parameterized array of updates with incrementing `$N` | Already used implicitly in other routes; safe against injection |
| JSONB array handling | Custom text serialization | `JSON.stringify()` on write, column typed as `JSONB` | PostgreSQL parses JSONB at insert; reads come back as parsed JS objects via pg driver |

**Key insight:** The `pg` driver automatically deserializes `JSONB` columns into JavaScript objects/arrays. No manual `JSON.parse()` needed on the read path for `interests` or `suggestion_chips`.

---

## Common Pitfalls

### Pitfall 1: Wrong migration filename / number

**What goes wrong:** The CONTEXT.md says `012-phase-v22.sql` but migrations 012 and 013 already exist in the project. Using that number would conflict.
**Why it happens:** The phase context was written before checking the actual migration count.
**How to avoid:** The correct filename is `014-phase30-v22.sql`. Verified by inspecting `apps/api/src/db/migrations/`.
**Warning signs:** `\i` fails with "already exists" error if the migration wraps table creation without `IF NOT EXISTS`.

### Pitfall 2: Forgetting to add cover_photo to the PUT /api/events/:id handler

**What goes wrong:** The column exists in the DB but the PUT route never writes it because the destructuring doesn't include it.
**Why it happens:** The PUT route at line ~264 in events.ts explicitly destructures only named fields: `{ name, coupleCrossing, people, couples, assignments, eventDate, wishlistDeadline, featureFlags }`.
**How to avoid:** Add `coverPhoto` to the destructure and extend the UPDATE query's CASE pattern.
**Warning signs:** `PUT /api/events/:id` with `{ coverPhoto: "https://..." }` returns 200 but the column stays NULL.

### Pitfall 3: interests JSONB vs TEXT[] mismatch

**What goes wrong:** Requirement INFRA-05 says `interests TEXT[]` but CONTEXT.md says JSONB is recommended. Using `TEXT[]` and `JSONB` interchangeably breaks queries.
**Why it happens:** The requirement was written before the JSONB recommendation was confirmed.
**How to avoid:** Use `JSONB DEFAULT '[]'` in the migration. On write: `JSON.stringify(array)`. On read: pg driver deserializes automatically.
**Warning signs:** `SELECT interests FROM users` returns `["foo","bar"]` as a string when TEXT[], but as an array when JSONB.

### Pitfall 4: Module plan-tier check missing on potluck routes

**What goes wrong:** Potluck signup/category routes don't check `plan_tier`, allowing free events to use potluck.
**Why it happens:** The polls/rsvp pattern checks plan_tier but it's easy to omit on new routes.
**How to avoid:** Every potluck route (categories POST/PUT/DELETE and signups POST/DELETE) must query `SELECT plan_tier FROM events WHERE id = $1` and return `403 { error: "upgrade_required" }` for `plan_tier = 'free'`.
**Warning signs:** Free events can create potluck categories successfully.

### Pitfall 5: GET /users/me not returning new fields

**What goes wrong:** After refactoring PUT, the GET still only returns `id, email, name, createdAt, eventsOrganized` — the new columns are in the DB but not in the response.
**Why it happens:** The GET query is `SELECT id, email, name, created_at FROM users WHERE id = $1` — it doesn't select the new columns.
**How to avoid:** Update the GET query to also select `bio, interests, avatar_url, onboarding_complete` and include them in the response.
**Warning signs:** Mobile app can update `bio` via PUT but `GET /users/me` response is missing `bio`.

### Pitfall 6: Potluck module enabled for event_modules but signups allowed without it

**What goes wrong:** A participant POSTs to `/api/events/:id/potluck/signups` even though the potluck module isn't active, bypassing the module gating.
**Why it happens:** Route exists, plan tier is 'standard', but `event_modules` table has no potluck entry.
**How to avoid:** Category creation and signup routes should verify that an active potluck module exists in `event_modules` (following the polls pattern at line ~186 in modules.ts).
**Warning signs:** Signups succeed for events without potluck in `event_modules`.

---

## Code Examples

### Migration 014 — column additions pattern

```sql
-- Source: pattern from 011-phase25-modules-polls-rsvp.sql and CONTEXT.md decisions
BEGIN;

-- ── Users new columns ────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT TRUE;

-- ── Events new columns ───────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_photo TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_guest_invites BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- ── Potluck tables ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_potluck_categories (
  id              SERIAL PRIMARY KEY,
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  food_image_url  TEXT DEFAULT NULL,
  suggestion_chips JSONB DEFAULT '[]',
  status          VARCHAR(20) DEFAULT 'active',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potluck_categories_event_id ON module_potluck_categories(event_id);

CREATE TABLE IF NOT EXISTS module_potluck_signups (
  id              SERIAL PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES module_potluck_categories(id) ON DELETE CASCADE,
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id  INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Prevents a participant from signing up for the same category twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_potluck_signups_unique_participant
  ON module_potluck_signups(category_id, participant_id)
  WHERE participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_potluck_signups_category_id ON module_potluck_signups(category_id);

COMMIT;
```

### GET /api/events/:id/potluck/categories response shape

```typescript
// Source: CONTEXT.md decisions
{
  id: number,
  eventId: number,
  name: string,
  quantity: number,
  foodImageUrl: string | null,
  suggestionChips: string[],   // JSONB array, auto-parsed by pg driver
  status: 'active' | 'draft',
  createdAt: string
}
```

### POST /api/events/:id/potluck/signups — 409 conflict shape

```typescript
// Source: CONTEXT.md decisions
// On slot taken:
res.status(409).json({ error: "slot_taken", message: "Slot just taken" });
// On success:
res.status(201).json({
  id: signup.id,
  categoryId: signup.category_id,
  participantId: signup.participant_id,
  participantName: signup.participant_name,
  createdAt: signup.created_at,
});
```

### GET /api/users/me — updated response

```typescript
// Source: CONTEXT.md decisions
{
  id: number,
  email: string,
  name: string,
  bio: string | null,
  interests: string[],          // JSONB, pg auto-parses
  avatarUrl: string | null,
  onboardingComplete: boolean,
  createdAt: string,
  eventsOrganized: number,
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `PUT /users/me` accepts `{ name: string }` | Accepts `Partial<{ name, bio, interests, avatarUrl, onboardingComplete }>` | Phase 30 | Non-breaking if clients only send `name`; all existing callers continue to work |
| Events list has no cover photo concept | Returns `hasCoverPhoto: boolean` | Phase 30 | No payload bloat; mobile can show placeholder or fetch detail on tap |
| No potluck tables | `module_potluck_categories` + `module_potluck_signups` tables | Phase 30 | Unlocks Phases 31–33 mobile UI |

**Note on backward compatibility:** The PUT /users/me refactor is safe because the new implementation will still accept `{ name }` alone — it just won't require it. The 400 "Name is required" validation must be removed; if a client sends no fields at all a different 400 is returned.

---

## Open Questions

1. **`event_type` column**
   - What we know: MEMORY.md says `events` table has `event_type` column added in Phase 22 context. Migration 011 adds other Phase 22 columns but NOT `event_type`. The schema.sql file doesn't show it, and events.ts code doesn't reference it.
   - What's unclear: Was `event_type` actually applied in a migration that's not in the migrations folder (applied directly), or is it missing?
   - Recommendation: Do NOT add `event_type` in the Phase 30 migration unless explicitly required. The phase requirements (INFRA-01 through INFRA-07) don't mention it. If it's needed by Phases 31–33, add it then.

2. **Potluck status field schema**
   - What we know: CONTEXT.md marks "Potluck status field (draft/active) schema design" as Claude's Discretion. The existing `event_modules` table uses `status VARCHAR(20) DEFAULT 'active'`.
   - Recommendation: Add `status VARCHAR(20) DEFAULT 'active'` to `module_potluck_categories` with a CHECK constraint `CHECK (status IN ('active', 'draft', 'closed'))` — consistent with the event_modules pattern.

3. **Whether to add updated_at trigger to potluck tables**
   - What we know: `wishlists` and `invites` have `updated_at` triggers using the existing `update_updated_at_column()` function. Potluck categories will be updated (status changes, quantity changes).
   - Recommendation: Add the trigger for `module_potluck_categories` (categories get edited). Skip it for `module_potluck_signups` (signups are insert-only / delete-only, no updates).

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `apps/api/src/routes/users.ts` — current PUT /users/me implementation
- Direct code inspection: `apps/api/src/routes/modules.ts` — polls, RSVP, plan-tier check patterns
- Direct code inspection: `apps/api/src/routes/events.ts` — baseSelect, event detail shape, PUT update pattern
- Direct code inspection: `apps/api/src/db/migrations/011-phase25-modules-polls-rsvp.sql` — migration format
- Direct code inspection: `apps/api/src/db/migrations/012-phase27-account-linking.sql` — confirms next number is 014 (012 and 013 exist)
- Direct code inspection: `apps/api/src/server.ts` — confirms modulesRouter registered at `/api/events`
- Official PostgreSQL docs (WebFetch): INSERT ON CONFLICT semantics, FOR UPDATE lock behavior

### Secondary (MEDIUM confidence)
- WebFetch of PostgreSQL official docs: confirmed `SELECT FOR UPDATE` is the correct serialization primitive for capacity checks; ON CONFLICT alone is insufficient for quantity > 1

### Tertiary (LOW confidence)
- None — all claims verified against source code or official docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, entire stack inspected from source
- Architecture: HIGH — all patterns taken directly from existing route files
- Pitfalls: HIGH — all identified from direct code inspection (migration number conflict, missing destructure, etc.)
- SQL types: HIGH — JSONB recommended in CONTEXT.md, consistent with existing `feature_flags JSONB` pattern

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain — PostgreSQL + Express patterns don't shift quickly)
