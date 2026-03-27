# Architecture Patterns

**Domain:** Gatherly Mobile — Tier Enforcement + Paywall UX Milestone
**Researched:** 2026-03-27
**Confidence:** HIGH — sourced entirely from live codebase inspection
**Supersedes:** Previous v2.2 entry (potluck/onboarding questions answered; this file focuses on pricing/paywall integration)

---

## Current System Snapshot

### Relevant existing files

```
apps/api/src/
  routes/
    events.ts        — event CRUD; plan_tier in SELECT + response for GET / and /:id
    modules.ts       — PUT /:id/modules enforces upgrade_required 403 on free + premium
  db/
    schema.sql       — plan_tier VARCHAR(50) DEFAULT 'free' on events table (line 217)

apps/gatherly-mobile/app/
  api/
    events.ts        — TEvent.planTier: 'free' | 'standard' (line 44)
  modules-config.tsx — reads planTier from EventsContext; shows upgrade modal on 403
  potluck-setup.tsx  — screen-level free-tier gate: renders PaywallScreen if isFree
  event-details.tsx  — renders module cards; no tier-aware logic currently
  edit-event.tsx     — participant management UI; no cap enforcement currently
```

### What is already built (do not redesign)

| Mechanism | Where | Behavior |
|---|---|---|
| `plan_tier` column | `events` DB table | `'free'` default; `'premium'` unlocks modules |
| Module 403 on free | `PUT /api/events/:id/modules` | Returns `{ error: "upgrade_required" }` |
| `planTier` in TEvent | `app/api/events.ts` | Flows from API → EventsContext → any screen |
| Upgrade modal stub | `modules-config.tsx` | `showUpgradeModal` state; "Coming Soon" button |
| Screen-level paywall gate | `potluck-setup.tsx` | Renders locked screen if `isFree` before content |

### What is missing (this milestone's work)

1. Participant cap enforcement (API + mobile UI)
2. Trial limit counters on free-tier modules (e.g., "3 of 10 categories used")
3. Dedicated paywall/pricing screen (navigable, not just a modal)
4. Upgrade CTA routing — where does "Upgrade" go without real payment?
5. Consistent paywall component reused across screens (currently each screen rolls its own)
6. Photo gallery module — UI placeholder decision

---

## Tier Data Flow

```
PostgreSQL events.plan_tier
  ↓  GET /api/events (list) + GET /api/events/:id
  ↓  eventsApi.getAll() / eventsApi.getById()
  ↓  EventsContext.state.events[n].planTier
  ↓  Any screen: const event = events.find(e => e.id === id); const isFree = event.planTier === 'free'
```

**Key property:** `planTier` is already present on every event object in `EventsContext` after the initial events fetch. No additional API call is needed to read the tier in any screen. Screens read it synchronously from `useEvents()`.

**Tier value discrepancy (important):** The DB column stores `'free'` and (intended future) `'premium'`. The `TEvent` type in `app/api/events.ts` line 44 declares `planTier?: 'free' | 'standard'`. These two values (`'premium'` vs `'standard'`) are mismatched. The API response from `events.ts` coalesces to `plan_tier || 'free'` but any non-free value comes from the DB column directly. Before building upgrade flows, **pick one string and use it consistently** — the DB column, the API response, and the TypeScript type must agree. Recommendation: use `'premium'` to match the DB default and the modules.ts route constant (line 9: `const PREMIUM_MODULES`).

---

## New Components Needed

### 1. `<PaywallBanner>` component (new)

**File:** `apps/gatherly-mobile/components/PaywallBanner.tsx`

A reusable inline banner shown at the top of premium screens when the event is free-tier. Replaces the three currently divergent implementations (upgrade modal in modules-config, inline disabled button in potluck-setup, and the free-tier banner in modules-config).

```
Props:
  featureName: string        — "Potluck", "Polls", "RSVP"
  onUpgradePress: () => void — called when "Upgrade" tapped
```

Renders a teal card with feature name, short copy, and an "Upgrade Plan" pressable that calls `onUpgradePress`. `onUpgradePress` routes to the pricing screen.

### 2. `app/pricing.tsx` screen (new)

**Route:** `/pricing?eventId=X`

The upgrade destination. Since no payment processing exists, this is a stub screen showing:
- Current plan badge ("Free Plan")
- Premium plan features list
- "Upgrade" button that calls `PUT /api/events/:id/plan` (a new API endpoint that sets `plan_tier = 'premium'`) — developer/demo mode only, no payment
- After successful upgrade, invalidates the event in EventsContext and navigates back

This is the single destination for all "Upgrade" CTAs across the app. Every paywall should route here.

### 3. `app/api/plans.ts` client file (new)

```typescript
export const plansApi = {
  upgrade: async (eventId: string): Promise<void> => {
    await apiClient.post(`/api/events/${eventId}/upgrade`);
  },
};
```

---

## Modified Components

### `apps/api/src/routes/events.ts`

**Additions required:**

1. **Participant cap enforcement on `POST /:id/participants`**

   Free events: cap at 10 participants. Check count before insert:

   ```typescript
   // After ownership check, before INSERT:
   const event = await query("SELECT plan_tier FROM events WHERE id = $1", [id]);
   const planTier = event.rows[0]?.plan_tier || 'free';
   if (planTier === 'free') {
     const countResult = await query(
       "SELECT COUNT(*)::int AS count FROM participants WHERE event_id = $1", [id]
     );
     if (countResult.rows[0].count >= 10) {
       return res.status(403).json({ error: "participant_cap_reached", limit: 10 });
     }
   }
   ```

   The cap check lives here (API-side) not only client-side. Client-side enforcement is UX sugar; API enforcement is correctness.

2. **New route: `POST /api/events/:id/upgrade`**

   Sets `plan_tier = 'premium'` for the event. Organizer-only. No payment logic — stub for demo:

   ```typescript
   router.post("/:id/upgrade", authenticateJWT, requireOrganizer, asyncHandler(...));
   // UPDATE events SET plan_tier = 'premium' WHERE id = $1 AND organizer_id = $2
   // Returns updated event
   ```

### `apps/gatherly-mobile/app/api/events.ts`

**Changes required:**

1. Fix `TEvent.planTier` union type to `'free' | 'premium'` (align with DB and modules.ts)
2. Add `participantCount?: number` to `TEvent` — needed to show "8 of 10 participants" in UI. The API already returns `people: string[]`, so `participantCount` can be derived on the client as `event.people.length`, but an explicit field avoids confusion.

### `apps/gatherly-mobile/app/modules-config.tsx`

**Changes required:**

1. Replace the inline upgrade modal with `<PaywallBanner>` + navigation to `/pricing?eventId=${id}`
2. The `showUpgradeModal` state and its Modal JSX (lines 131, 367–422) can be removed once `PaywallBanner` navigates to the pricing screen
3. The existing `handleToggle` 403 catch block (`err?.response?.data?.error === "upgrade_required"`) should call `router.push('/pricing?eventId=${id}')` instead of `setShowUpgradeModal(true)`

### `apps/gatherly-mobile/app/potluck-setup.tsx`

**Changes required:**

1. The screen-level free-tier gate (lines 616–684) renders a custom locked view with a disabled "Upgrade Plan" button. Replace with `<PaywallBanner>` routed to `/pricing?eventId=${id}` and remove the bespoke locked-view JSX.

### `apps/gatherly-mobile/app/edit-event.tsx`

**Changes required:**

1. **Client-side participant cap indicator:** When `isFree && event.people.length >= 10`, show an inline notice below the participant list: "Free plan: 10 participant limit. Upgrade to add more." The add-participant button should be disabled or trigger the `<PaywallBanner>` / pricing navigation.
2. **Error handling for `participant_cap_reached` (403):** `eventsApi.addParticipant()` must catch this response code and surface it to the user as a paywall prompt rather than a generic error toast.

### `apps/gatherly-mobile/app/event-details.tsx`

**Changes required:**

1. The `handleModuleTap` function (lines 236–274) should check `isFree && entry.premium` before routing. If a premium module is tapped and the event is free, route to `/pricing?eventId=${id}` instead of showing the "Enable this module" toast. Currently the tap behavior assumes the module is either active or inactive, not gated by tier.
2. Add a free-tier "Upgrade" badge or indicator in the Event Hub section header for free events, consistent with the modules-config banner.

---

## Participant Cap Enforcement

### Decision: API-side + client-side both

**API-side (authoritative):** `POST /api/events/:id/participants` returns `403 { error: "participant_cap_reached", limit: 10 }` when a free event already has 10 participants.

**Client-side (UX):** The add-participant UI in `edit-event.tsx` counts `event.people.length` from EventsContext (already available, no extra fetch). If at cap, disable the add button and show an inline upgrade CTA before the user even taps.

**Why both:** API enforcement prevents circumvention. Client enforcement avoids a round-trip to discover the cap, improving perceived responsiveness.

**Cap value:** 10 participants on free tier. This is a business decision not currently in the code — define it as a constant in the API:

```typescript
// apps/api/src/routes/events.ts (top of file, near imports)
const FREE_PARTICIPANT_LIMIT = 10;
```

And in mobile:

```typescript
// apps/gatherly-mobile/app/constants/tiers.ts (new file)
export const FREE_PARTICIPANT_LIMIT = 10;
export const FREE_POTLUCK_CATEGORY_LIMIT = 10; // for trial limits
```

---

## Trial Limits (Usage Counters on Free Tier)

Trial limits are different from hard blocks. A hard block says "you cannot use this feature." A trial limit says "you have used X of Y — upgrade to go further." The potluck category count is the primary candidate.

### Potluck category counter

The `GET /api/events/:id/potluck/categories` response already returns all categories. The mobile client counts `categories.length`. On free tier, if `categories.length >= FREE_POTLUCK_CATEGORY_LIMIT`, show a banner in `potluck-setup.tsx`: "10 of 10 categories used on free plan. Upgrade for unlimited."

No API change needed — count is derived client-side from the existing response.

### Pattern for other trial limits

The same pattern applies to future limits:
1. API returns the resource list
2. Client counts items
3. Client compares against a constant from `tiers.ts`
4. UI shows counter + upgrade CTA at the limit

Do not add a `usageCount` field to the API response for this milestone. Derive it from existing data.

---

## Upgrade CTA Routing

### The "Upgrade" action

All upgrade CTAs across the app route to a single destination: `router.push('/pricing?eventId=${eventId}')`.

**Why a full screen, not a modal:** Modals are appropriate for quick confirmations. A pricing screen needs to show plan comparison, feature lists, and a clear CTA. `modules-config.tsx` currently uses a modal (`showUpgradeModal`) — this was reasonable as a placeholder but becomes fragile as the feature count grows.

**Why event-scoped:** Upgrade is per-event (`plan_tier` is on the events table, not the users table). The pricing screen needs `eventId` to call `POST /api/events/:id/upgrade`.

### Upgrade flow (stub, no payment)

```
User taps "Upgrade" anywhere
  → router.push('/pricing?eventId=X')
  → pricing.tsx renders plan comparison
  → User taps "Upgrade to Premium"
  → plansApi.upgrade(eventId)  →  POST /api/events/:id/upgrade
  → API sets plan_tier = 'premium'
  → pricing.tsx calls eventsApi.getById(eventId) to refresh event
  → EventsContext is updated (existing refreshEvents() pattern or direct state mutation)
  → router.back() or router.replace('/modules-config?id=X')
  → modules-config.tsx re-reads planTier === 'premium', unlocks toggles
```

### EventsContext refresh after upgrade

`EventsContext` currently loads events on mount. After an upgrade, the cached event in context still shows `planTier: 'free'`. Two options:

1. **Call `refreshEvents()` from pricing.tsx after upgrade** — re-fetches all events, guaranteed consistent. Simple but fetches more than needed.
2. **Dispatch a local update** — `dispatch({ type: 'UPDATE_EVENT', payload: { id, planTier: 'premium' } })` — avoids a full refetch but requires a new action type in the EventsContext reducer.

Recommendation: use option 1 (`refreshEvents()`) for this milestone. The events list is small; a full refresh is acceptable. Option 2 is an optimization for later.

---

## Photo Gallery Module

### Decision: UI placeholder only, no DB schema this milestone

`photo_gallery` is already present in `MODULE_CATALOG` in `event-details.tsx` (line 97) and `MODULE_DEFS` in `modules-config.tsx` (line 101) with `comingSoon: true`. Both screens already render it with a lock icon and "Coming soon" label.

**No DB schema change needed this milestone.** The gallery requires:
- Storage for uploaded images (S3, Cloudinary, or similar) — not yet decided
- A `module_photo_gallery_items` table
- A photo upload API

These are non-trivial infrastructure decisions. Treat the gallery as a placeholder in the module catalog until the storage strategy is resolved. The `comingSoon: true` flag in both catalog arrays is the correct current state.

**If the milestone scope requires removing "comingSoon" from gallery:** flip `comingSoon` to `false` and add a premium tier check (`premium: true` is already set in `modules-config.tsx`). The module toggle will show it as locked-for-free and no-op for premium (no route yet). A stub message screen can be added as `app/photo-gallery.tsx` with "Photo Gallery coming soon" copy.

---

## Build Order

Dependencies between components determine the sequence. The tier data flow already exists end-to-end; what's missing is consistent UX and the participant cap.

```
Step 1 — Fix tier constant mismatch (unblocks everything else)
  - Align plan_tier DB value, API response, and TEvent type to 'free' | 'premium'
  - Add FREE_PARTICIPANT_LIMIT and FREE_POTLUCK_CATEGORY_LIMIT to tiers.ts

Step 2 — API: participant cap + upgrade endpoint
  - events.ts: add cap check in POST /:id/participants
  - events.ts: add POST /:id/upgrade route
  - New app/api/plans.ts client

Step 3 — Shared PaywallBanner component
  - components/PaywallBanner.tsx
  - Must exist before screens use it

Step 4 — Pricing screen
  - app/pricing.tsx
  - Add Stack.Screen in _layout.tsx
  - Connects PaywallBanner destinations to an actual route

Step 5 — Update existing screens to use PaywallBanner + pricing route
  - modules-config.tsx: replace modal with PaywallBanner + router.push('/pricing')
  - potluck-setup.tsx: replace bespoke locked view with PaywallBanner
  - edit-event.tsx: add participant cap UI and 403 error handling
  - event-details.tsx: add premium module tap → pricing route

Step 6 — Trial limit counters (depends on Step 1 constants)
  - potluck-setup.tsx: add category count banner at limit
  - No API changes needed
```

Steps 3 and 4 can be built in parallel by the same developer in the same session. Step 2 can be done before or during step 3 without blocking.

---

## Component Boundaries Summary

### New files

| File | Type | Purpose |
|---|---|---|
| `apps/gatherly-mobile/components/PaywallBanner.tsx` | Component | Reusable locked-feature banner with upgrade CTA |
| `apps/gatherly-mobile/app/pricing.tsx` | Screen | Upgrade destination; shows plan comparison and upgrade button |
| `apps/gatherly-mobile/app/api/plans.ts` | API client | `plansApi.upgrade(eventId)` |
| `apps/gatherly-mobile/app/constants/tiers.ts` | Constants | `FREE_PARTICIPANT_LIMIT`, `FREE_POTLUCK_CATEGORY_LIMIT` |

### Modified files

| File | Change |
|---|---|
| `apps/api/src/routes/events.ts` | Add cap check in POST participants; add POST /:id/upgrade |
| `apps/gatherly-mobile/app/api/events.ts` | Fix TEvent.planTier union to `'free' \| 'premium'` |
| `apps/gatherly-mobile/app/_layout.tsx` | Add Stack.Screen for `pricing` |
| `apps/gatherly-mobile/app/modules-config.tsx` | Replace upgrade modal with PaywallBanner + pricing route |
| `apps/gatherly-mobile/app/potluck-setup.tsx` | Replace bespoke locked view with PaywallBanner |
| `apps/gatherly-mobile/app/edit-event.tsx` | Add participant cap UI; handle participant_cap_reached 403 |
| `apps/gatherly-mobile/app/event-details.tsx` | Route premium module taps to pricing on free events |

---

## Anti-Patterns to Avoid

### Putting upgrade state on the user, not the event

`plan_tier` is on `events`, not `users`. Do not add a `userTier` concept. One user can have a free event and a premium event simultaneously. All tier checks must be event-scoped.

### Client-only participant cap enforcement

If the mobile app is the only thing checking the cap, a determined user (or a bug, or a future API consumer) can bypass it. The API must be the authoritative gate. Client enforcement is additive UX, not a replacement.

### Multiple upgrade modals per screen

`modules-config.tsx` has an inline Modal, `potluck-setup.tsx` has a bespoke locked view, and future screens would each add their own. This creates maintenance drift. `PaywallBanner` + a single pricing screen is the single pattern — enforce it from step 3 onward.

### Deep-linking upgrade to a payment provider directly

There is no payment processor yet. Do not add a deep-link or external URL to a payment page. Route to `pricing.tsx` internally. When payment is eventually added, only `pricing.tsx` needs to change.

### Caching stale planTier after upgrade

After `POST /api/events/:id/upgrade` succeeds, the EventsContext cache still holds `planTier: 'free'`. Any screen that reads tier from context will remain in the gated state until the cache is invalidated. Call `refreshEvents()` immediately after a successful upgrade before navigating back.

---

## Sources

All findings are from direct inspection of the following files (no external sources):

- `apps/api/src/routes/events.ts` — participant management, plan_tier in queries
- `apps/api/src/routes/modules.ts` — upgrade_required 403 pattern, PREMIUM_MODULES constant
- `apps/gatherly-mobile/app/api/events.ts` — TEvent type, planTier field (line 44)
- `apps/gatherly-mobile/app/event-details.tsx` — module card rendering, handleModuleTap
- `apps/gatherly-mobile/app/modules-config.tsx` — upgrade modal, handleToggle 403 catch
- `apps/gatherly-mobile/app/potluck-setup.tsx` — screen-level free-tier gate pattern
- `apps/gatherly-mobile/app/edit-event.tsx` — participant management UI structure
- `apps/gatherly-mobile/app/api/modules.ts` — modulesApi shape
- `apps/api/src/db/schema.sql` — plan_tier column definition (line 217)
