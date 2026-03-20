# Architecture Patterns

**Domain:** Gatherly Mobile — v2.2 UI Rehaul (Potluck Module, Onboarding, Event/User Schema Additions)
**Researched:** 2026-03-17
**Confidence:** HIGH — sourced entirely from live codebase inspection

---

## Current System Snapshot

```
apps/api/src/
  routes/
    events.ts        — event CRUD, participants, couples, assignments
    modules.ts       — event_modules CRUD, polls CRUD+vote, rsvp submit
    wishlists.ts     — participant wishlist items + claiming
    invites.ts       — invite creation, resend, revoke, magic-link
    users.ts         — GET/PUT /api/users/me
    auth.ts          — login, register, refresh, logout
  db/
    schema.sql       — canonical schema + ADD COLUMN IF NOT EXISTS migrations
    migrations/      — numbered SQL migration files
  middleware/
    auth.ts          — authenticateJWT, optionalAuth
    requireOrganizer.ts — blocks participant-scoped JWT tokens

apps/gatherly-mobile/app/
  _layout.tsx        — root Stack with Stack.Protected auth guards
  (tabs)/
    _layout.tsx      — two-tab bar: Events, Profile
    index.tsx        — events list
    profile.tsx      — user profile + edit name
  event-details.tsx  — event detail hub (modules, participants, assignments)
  edit-event.tsx     — organizer event editor
  modules-config.tsx — module toggle screen
  polls.tsx          — polls module screen
  rsvp.tsx           — RSVP module screen
  sign-in.tsx        — login
  register.tsx       — registration
  join.tsx           — magic-link / invite code join
  magic-link/[token].tsx — magic-link redemption
  api/
    events.ts        — eventsApi + TEvent + TEventModule types
    modules.ts       — modulesApi (polls, rsvp stubs)
    users.ts         — usersApi
    invites.ts       — invitesApi
    client.ts        — axios instance
  contexts/
    AuthContext.tsx  — SessionProvider, useSession()
    EventsContext.tsx — EventsProvider, useEvents()
```

### JWT Token Shape (critical constraint)

Two distinct token shapes flow through the system:

| Token type | Claims | Issued by |
|---|---|---|
| Organizer JWT | `{ userId, email, name }` | `POST /api/auth/login` or `/register` |
| Participant JWT | `{ participantId, eventId, email }` | `/api/invites/redeem` magic-link |

`requireOrganizer` middleware blocks participant-scoped tokens. Any new route that should be organizer-only must use both `authenticateJWT` and `requireOrganizer`.

---

## Question 1: Potluck Module Integration

### Current state

Phase 25 added `event_modules` with `module_type = 'potluck'` as a valid value and the paywall toggle in `modules-config.tsx`. The `event-details.tsx` screen renders a Potluck row in the modules list but the `route` variable is an empty string — pressing it does nothing. No potluck-specific tables or API routes exist.

### Recommended integration pattern

Follow the identical structure used for polls: module-gated tables + routes under `/api/events/:id/potluck*`.

**Module gate check** (copy from polls pattern):

```typescript
// In every potluck route handler, verify the module is active:
const moduleResult = await query(
  "SELECT id FROM event_modules WHERE event_id = $1 AND module_type = 'potluck' AND status = 'active'",
  [id],
);
if (moduleResult.rows.length === 0) {
  return res.status(400).json({ error: "potluck module not enabled" });
}
```

**Plan-tier gate** is already enforced by the existing `PUT /api/events/:id/modules` route — no additional check needed in potluck routes, because a potluck module row can only exist if the event was upgraded.

### Potluck screen routing

Add a route entry in `_layout.tsx` and wire `event-details.tsx`:

```
_layout.tsx     →   <Stack.Screen name="potluck" options={{ headerShown: false }} />
event-details.tsx route variable for potluck:  `/potluck?id=${id}`
```

New file: `apps/gatherly-mobile/app/potluck.tsx`

---

## Question 2: Potluck Database Schema

### Design analysis (from screen templates)

Potluck-Setup.png shows: organizer creates **categories** (Main Dish, Sides, Drinks) each with a **quantity needed** and optional **suggestions** (chip tags). Potluck-List.png shows items within categories with avatar of who signed up or a "Signup" button. Potluck-Signup.png shows a confirmation screen with optional note field.

The design is a **category → items → signups** three-level hierarchy. Each category has a quantity needed; each item slot can be claimed by one participant.

### Recommended schema (new migration 012)

```sql
-- Potluck categories (defined by organizer per event)
CREATE TABLE IF NOT EXISTS module_potluck_categories (
  id           SERIAL PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  module_id    INTEGER NOT NULL REFERENCES event_modules(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,        -- "Main Dish", "Sides", "Drinks"
  quantity      INTEGER NOT NULL DEFAULT 1,  -- how many slots needed
  suggestions  TEXT[],                       -- ["Lasagna", "Tacos", "Roast Chicken"]
  image_url    TEXT,                         -- optional category image
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potluck_categories_event_id
  ON module_potluck_categories(event_id);

-- Potluck slots (one row per quantity unit — a category with qty=4 has 4 rows)
-- Rationale: individual rows allow individual participant claims with notes.
CREATE TABLE IF NOT EXISTS module_potluck_signups (
  id              SERIAL PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES module_potluck_categories(id) ON DELETE CASCADE,
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id  INTEGER REFERENCES participants(id) ON DELETE SET NULL,  -- NULL = unclaimed
  item_name       VARCHAR(255),   -- participant's specific item (e.g. "Potato Salad")
  note            TEXT,           -- optional detail ("store-bought, gluten-free")
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_potluck_signups_category_id
  ON module_potluck_signups(category_id);
CREATE INDEX IF NOT EXISTS idx_potluck_signups_event_id
  ON module_potluck_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_potluck_signups_participant_id
  ON module_potluck_signups(participant_id);
```

**Why slot rows instead of a quantity column on signups:**

The Potluck-List.png shows Spring Rolls (unclaimed) and Chips & Salsa (claimed by Sarah) as separate rows within Appetizers. Each slot is a discrete unit that a participant claims. If quantity = 4, the organizer creates 4 `module_potluck_signups` rows with `participant_id = NULL` at setup time. A participant claims one by updating `participant_id`, `item_name`, and `note`.

**Slot pre-population on category create:**

When the organizer saves a category with `quantity = N`, the API inserts N slot rows with `participant_id = NULL`. Changing quantity later adds or deletes unclaimed rows (never delete claimed rows — return 409 instead).

### API endpoints for potluck (added to modules.ts)

```
GET    /api/events/:id/potluck/categories
  → list categories with their slots + who claimed each

POST   /api/events/:id/potluck/categories         (organizer only)
  → create category, pre-populate slots

PUT    /api/events/:id/potluck/categories/:catId  (organizer only)
  → update name/quantity/suggestions (adjust unclaimed slot count)

DELETE /api/events/:id/potluck/categories/:catId  (organizer only)
  → only if all slots unclaimed; else 409

POST   /api/events/:id/potluck/signups/:slotId    (participant — requires participantId)
  → claim a slot; body: { itemName, note }

DELETE /api/events/:id/potluck/signups/:slotId    (participant — own slot only)
  → release a claimed slot
```

### Mobile API client additions (app/api/modules.ts)

```typescript
export type TPotluckSlot = {
  id: number;
  participantId: number | null;
  participantName: string | null;
  itemName: string | null;
  note: string | null;
};

export type TPotluckCategory = {
  id: number;
  name: string;
  quantity: number;
  suggestions: string[];
  imageUrl?: string | null;
  sortOrder: number;
  slots: TPotluckSlot[];
};
```

---

## Question 3: Welcoming Onboarding Navigation

### Current auth navigation flow

```
_layout.tsx: Stack
  Stack.Protected guard={!!session}     — authenticated screens
    (tabs)
    edit-event
    event-details
    ...
  Stack.Protected guard={!session}      — unauthenticated screens
    sign-in
    register
  Public (no guard)
    join
    magic-link/[token]
```

After `register.tsx` calls `signIn()`, `session` becomes truthy and `Stack.Protected guard={!session}` hides the unauthenticated screens. Control returns to the authenticated tree at `(tabs)` (events list).

### Onboarding must inject between register and (tabs)

The Welcoming templates show a 3-screen flow:

1. Getting-Started (splash carousel, 3 dots, "Get Started" button) — shown before auth
2. Profile-Setup (Step 1 of 3: name, short bio, gift preferences)
3. Preferences (Step 2 of 3: interest selection — "What are you into?")

Getting-Started is a pre-auth landing, so it lives in the unauthenticated stack. Profile-Setup and Preferences are post-registration steps within the authenticated stack.

### Recommended approach: onboarding_complete flag in SecureStore

```
AuthContext: add field  onboardingComplete: boolean
SecureStore key:        "gatherly_onboarding_complete"
```

**Flow after register:**

1. `register.tsx` calls `authApi.register()` → `signIn(token, user)`
2. `signIn()` checks `SecureStore.getItem("gatherly_onboarding_complete")`
3. If absent: sets `onboardingComplete = false`
4. `_layout.tsx` reads `onboardingComplete` from `useSession()`
5. Renders onboarding screens instead of `(tabs)` when session exists but onboarding incomplete

**_layout.tsx guard logic:**

```typescript
// Within Stack.Protected guard={!!session}:
<Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
// ... other authenticated screens
```

The `onboarding` route renders the multi-step flow. On completion it calls `markOnboardingComplete()` (sets SecureStore key + context state) then `router.replace('/(tabs)')`.

**Why not a separate Stack.Protected block for onboarding:**

`Stack.Protected guard={!session}` hides unauthenticated routes once session exists. Onboarding is post-registration so it belongs inside the authenticated guard. The `onboardingComplete` flag acts as a soft gate within the authenticated tree, handled by the `onboarding.tsx` screen itself (redirect to tabs if already complete) — not by the layout guard. This is simpler than adding a third `Stack.Protected` block.

### New files

```
app/onboarding.tsx          — multi-step onboarding container (progress bar, step renderer)
app/onboarding/             — (optional) split into step files if complex
```

**Register.tsx change:** After `signIn()` succeeds, push to `/onboarding` instead of letting the Stack.Protected redirect to tabs automatically. Use `router.replace('/onboarding')` to prevent back-navigation to register.

**Sign-in.tsx change:** After `signIn()` succeeds, check `onboardingComplete`; if false, `router.replace('/onboarding')`.

**Getting-Started (pre-auth landing):**

The screen templates show this as a standalone splash before the user taps "Get Started" (which navigates to register). This belongs in the unauthenticated stack as `app/welcome.tsx`. The current sign-in screen already renders a Gatherly logo + "Welcome Back" heading. The Getting-Started screen replaces the direct `/sign-in` entry as the first unauthenticated screen shown to first-time users.

```
_layout.tsx unauthenticated block:
  Stack.Screen name="welcome"   — new getting-started screen
  Stack.Screen name="sign-in"
  Stack.Screen name="register"
```

Default route when no session: navigate to `welcome` (not `sign-in`) if `gatherly_has_launched` SecureStore key is absent, else go to `sign-in`.

---

## Question 4: New Event Fields

### Fields needed (from Edit.png template)

The Manage Event screen shows: cover photo (thumbnail), event date+time, location ("Central Park, NY"), "Allow guests to invite others" toggle, "Public event" toggle.

### DB additions

```sql
-- Migration 012 (same migration as potluck schema above)
ALTER TABLE events ADD COLUMN IF NOT EXISTS location         VARCHAR(500) DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_photo_url  TEXT         DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_guest_invites BOOLEAN   DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public        BOOLEAN      DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);
```

**Why cover_photo_url as TEXT (not base64 in column):**

The current codebase stores images as base64 in `image_url` columns (wishlists, gifts). The events table is included in the large `GET /api/events` aggregate query that already returns full event rows. Adding a base64 blob to every event in the list response would significantly inflate payload size. `cover_photo_url` should store a URL string pointing to an uploaded asset. For the initial implementation, this can still be a base64 data URL stored client-side and uploaded as-is — but name the column `_url` to leave the door open for a CDN migration without a rename.

**Existing `feature_flags JSONB` could absorb `allow_guest_invites` and `is_public`:**

This is a valid alternative. The trade-off: JSONB flags are not individually indexable without expression indexes, and the column semantics become implicit. For boolean fields used in routing logic (e.g., future public event discovery), explicit columns with their own indexes are safer. Use explicit columns.

### API changes

`GET /api/events` and `GET /api/events/:id` must include the four new columns in SELECT and response mapping. `PUT /api/events/:id` must accept them in the body (organizer-only, enforced by `requireOrganizer`).

**Response shape addition to TEvent:**

```typescript
// apps/gatherly-mobile/app/api/events.ts
export type TEvent = {
  // ... existing fields ...
  // v2.2 additions
  location?: string | null;
  coverPhotoUrl?: string | null;
  allowGuestInvites?: boolean;
  isPublic?: boolean;
};
```

---

## Question 5: User Interests / Preferences

### Fields needed (from Preferences.png template)

The screen shows interest tags (Music & Concerts, Tech & AI, Social Mixers, etc.) — multi-select, minimum 3. The Profile-Setup screen shows a "Gift Preferences" free-text field and "Short Bio".

### DB additions

```sql
-- Migration 012 (continued)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio              TEXT     DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_preferences TEXT     DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests        TEXT[]   DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url       TEXT     DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
```

**Why `interests TEXT[]` (array) not a junction table:**

A junction table (`user_interests`) is appropriate when interests are foreign-keyed to a canonical list used for querying (e.g., "find events matching user interests"). In this milestone, interests inform personalization UI only — they are not used in server-side queries or matching. A `TEXT[]` column is sufficient and avoids the overhead of a new table. If a canonical interest taxonomy is needed later, migrate to a junction table at that point.

**Why `onboarding_complete` in DB (not only in SecureStore):**

`SecureStore` is device-local. If a user reinstalls the app or logs in on a new device, the onboarding flow would re-trigger. Storing `onboarding_complete` server-side allows the `GET /api/users/me` endpoint to return it, letting `AuthContext` skip the onboarding screen on second devices.

**`GET /api/users/me` response addition:**

```typescript
// Current UserProfile type
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  eventsOrganized: number;
  // v2.2 additions
  bio?: string | null;
  giftPreferences?: string | null;
  interests?: string[];
  avatarUrl?: string | null;
  onboardingComplete?: boolean;
}
```

**`PUT /api/users/me` body additions:**

```typescript
{
  name?: string;
  bio?: string;
  giftPreferences?: string;
  interests?: string[];
  avatarUrl?: string;
  onboardingComplete?: boolean;
}
```

The `users.ts` route currently only accepts `name`. Extend the UPDATE SET clause to accept these fields selectively (patch semantics: only update keys present in body).

---

## Component Boundaries

### New screens and their ownership

| Screen file | Route | Auth guard | Who uses it |
|---|---|---|---|
| `app/welcome.tsx` | `/welcome` | unauthenticated | First-time users, shown before sign-in |
| `app/onboarding.tsx` | `/onboarding` | authenticated | New registrants, post-register |
| `app/potluck.tsx` | `/potluck?id=X` | authenticated | Participants + organizer |
| `app/potluck-setup.tsx` | `/potluck-setup?id=X` | authenticated (organizer) | Organizer configures categories |

### Modified screens

| Screen file | What changes |
|---|---|
| `app/_layout.tsx` | Add `welcome`, `onboarding`, `potluck`, `potluck-setup` Stack.Screen entries |
| `app/register.tsx` | `router.replace('/onboarding')` after successful `signIn()` |
| `app/sign-in.tsx` | Check `onboardingComplete`; redirect to `/onboarding` if false |
| `app/event-details.tsx` | Wire potluck route; render location/cover photo fields |
| `app/edit-event.tsx` | Add location, cover photo, allow_guest_invites, is_public fields |
| `app/api/events.ts` | Add new TEvent fields |
| `app/api/modules.ts` | Add potluck types and API methods |
| `app/api/users.ts` | Add new UserProfile fields and updateMe payload |
| `app/contexts/AuthContext.tsx` | Add `onboardingComplete` state + `markOnboardingComplete()` |
| `app/(tabs)/_layout.tsx` | Potentially add tabs if design calls for it |

---

## Data Flow: Potluck Setup → Signup

```
Organizer flow:
  edit-event.tsx → router.push('/potluck-setup?id=X')
  potluck-setup.tsx → POST /api/events/:id/potluck/categories (per category)
    → API inserts category + N slot rows (participant_id = NULL)
  → router.back()

Participant flow:
  event-details.tsx → router.push('/potluck?id=X')
  potluck.tsx → GET /api/events/:id/potluck/categories (returns categories + slots with participant info)
  → participant taps "Signup" on unclaimed slot
  → confirmation sheet (Potluck-Signup.png): item name + optional note
  → POST /api/events/:id/potluck/signups/:slotId { itemName, note }
    → API: UPDATE module_potluck_signups SET participant_id=$1, item_name=$2, note=$3
  → potluck.tsx refetches categories
```

### Auth on potluck signup

The signup route must handle both organizer JWT (`userId`) and participant JWT (`participantId`). Pattern from `modules.ts` polls vote:

```typescript
if (!user.participantId && !user.userId) {
  return res.status(403).json({ error: "authentication required" });
}
// resolve participant: prefer participantId from token, else look up by userId+eventId
```

---

## Build Order

The features have these dependencies:

```
DB migration 012 (schema changes)
  ├── Potluck tables → Potluck API routes → Potluck mobile screens
  ├── events columns → events API changes → TEvent type → edit-event.tsx UI
  └── users columns → users API changes → UserProfile type → onboarding screens
        └── onboarding screens → welcome screen (both needed together)
```

### Recommended sequence

**Step 1 — DB migration (unblocks everything)**

Write `apps/api/src/db/migrations/012-phase-v22.sql`:
- Potluck tables
- Four event columns
- Five user columns

**Step 2 — API layer (must come before mobile)**

- Extend `events.ts` routes: include new columns in SELECT + response + PUT body
- Extend `users.ts` routes: patch-style PUT accepting new fields; GET returns new fields
- Add potluck routes to `modules.ts`: categories CRUD + signups CRUD

**Step 3 — Type layer (unblocks mobile)**

- Update `TEvent` in `app/api/events.ts`
- Update `UserProfile` and `usersApi` in `app/api/users.ts`
- Add potluck types to `app/api/modules.ts`

**Step 4 — AuthContext onboarding state**

- Add `onboardingComplete` + `markOnboardingComplete()` to `AuthContext`
- Read `onboardingComplete` from `GET /api/users/me` during `restoreSession()`

**Step 5 — Onboarding + welcome screens (can parallel with step 6)**

- `app/welcome.tsx` — pre-auth splash carousel
- `app/onboarding.tsx` — post-register 3-step flow (Profile Setup + Preferences)
- Wire `_layout.tsx` entries
- Update `register.tsx` and `sign-in.tsx` redirects

**Step 6 — Event fields UI (can parallel with step 5)**

- `edit-event.tsx`: location field, cover photo picker, two boolean toggles
- `event-details.tsx`: render location and cover photo in hero block

**Step 7 — Potluck screens (depends on steps 2+3)**

- `app/potluck-setup.tsx` — organizer category builder
- `app/potluck.tsx` — participant list + signup
- Wire route in `event-details.tsx` (remove `disabled` on potluck row, set route)

---

## Anti-Patterns to Avoid

### Storing potluck signups as a quantity column on categories

The quantity represents how many are needed, not how many signed up. Using `COUNT(signups)` to derive fulfillment preserves each individual claim as a distinct row with its own participant, item name, and note. Collapsing this into a counter loses that granularity.

### Gating onboarding inside _layout.tsx Stack.Protected with a third guard block

A third `Stack.Protected guard={!!session && !onboardingComplete}` sounds clean but creates navigation ordering issues: when `onboardingComplete` flips to true, the stack transitions simultaneously to the authenticated guard, causing a double-navigation flash. Better: let the onboarding screen handle its own guard (redirect to tabs if already complete) and let `_layout.tsx` stay simple.

### Adding cover photo as a base64 column on events

The `GET /api/events` list query already aggregates participants, couples, and assignments via multiple JOINs. Adding a base64 image blob (potentially 200KB+) to every row in that list response would make the list payload enormous. Store a URL string; upload separately.

### One signup row per category (instead of one per slot)

If signups are stored as `(category_id, participant_id, quantity_claimed)`, you cannot display which specific named item each participant is bringing, nor can two participants both claim slots in the same category independently. The slot-per-row design matches the template UI.

---

## Sources

All findings are based on direct codebase inspection:

- `apps/api/src/db/schema.sql` — current DB schema
- `apps/api/src/db/migrations/011-phase25-modules-polls-rsvp.sql` — Phase 25 migration pattern
- `apps/api/src/routes/modules.ts` — polls/rsvp route patterns
- `apps/gatherly-mobile/app/_layout.tsx` — navigation guard structure
- `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — session state shape
- `apps/gatherly-mobile/app/modules-config.tsx` — module toggle pattern
- `apps/gatherly-mobile/app/event-details.tsx` — module routing stubs
- `apps/gatherly-mobile/app/api/events.ts` — TEvent type
- `apps/gatherly-mobile/app/api/modules.ts` — modulesApi type pattern
- `apps/gatherly-mobile/screen-templates/Potluck/` — UI design templates
- `apps/gatherly-mobile/screen-templates/Welcoming/` — onboarding design templates
- `apps/gatherly-mobile/screen-templates/Edit.png` — event edit UI
