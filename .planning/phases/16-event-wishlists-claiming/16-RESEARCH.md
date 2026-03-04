# Phase 16: Event Wishlists + Claiming - Research

**Researched:** 2026-03-04
**Domain:** React Native / Expo Router — multi-participant wishlist browsing screen with optimistic claim/unclaim, SectionList layout, GlueStack Toast, and privacy-aware API response
**Confidence:** HIGH

---

## Summary

Phase 16 adds the Event Wishlists screen — a browseable view of all participants' wishlist items within a specific event, with anonymous claim/unclaim capability. The screen is a new flat-file route (`view-wishlists.tsx`) accessed from the Event Details screen via "View Wishlists" button. It uses a SectionList to group items by participant with "My Wishlist" pinned at top (alphabetical below), and uses long-press → GlueStack Actionsheet for claim/unclaim interactions on others' items. Own items use the same long-press → Edit/Delete flow from Phase 15.

**Critical blocker:** The Wishlists screen template is MISSING from `screen-templates/`. Per TMPL-02, the user must provide a PNG template before implementation begins. The planning step should capture this requirement and surface it as the first task.

The full backend infrastructure for this phase is already complete: `POST /api/events/:eventId/wishlists/:id/claim` and `DELETE /api/events/:eventId/wishlists/:id/claim` endpoints exist in `apps/api/src/routes/wishlists.ts` with atomic conflict-safe INSERT, self-claim guard, and ownership-scoped unclaim. The `wishlists` GET endpoint already returns `isClaimed` and `claimedByMe` booleans per item. The `wishlist_claims` table has a `UNIQUE(wishlist_id)` constraint enforcing one-claim-per-item at the database level.

The frontend work is: (1) add claim/unclaim methods to `wishlistsApi`, (2) add `CLAIM_WISHLIST_ITEM` and `UNCLAIM_WISHLIST_ITEM` reducer actions to EventsContext, (3) extend `TWishlistItem` type with `isClaimed`/`claimedByMe`, (4) create the new screen file, (5) register the route, (6) wire the Event Details "View Wishlists" button.

**Primary recommendation:** Wire claim/unclaim as optimistic updates against the existing API, use GlueStack `useToast` + `Toast` for brief confirmations, use React Native `SectionList` (not FlatList) for the section-header layout, and extend the existing TWishlistItem type rather than creating a new type.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native SectionList | built-in | Grouped participant sections with sticky headers | Native built-in; ideal for this exact layout pattern |
| GlueStack Actionsheet | installed | Long-press claim/unclaim/edit/delete menu | Same pattern used in Phase 15; locked decision |
| GlueStack useToast + Toast | installed | Brief claim/unclaim confirmation toast | ToastProvider already wraps entire app in GluestackUIProvider |
| GlueStack AlertDialog | installed | Delete confirmation (own items) | Same as Phase 15 pattern; already installed |
| lucide-react-native | ^0.510.0 | Icons (checkmark for claimed indicator) | Already in use across all screens |
| expo-router | ~6.0.4 | Navigation; new screen file | Already in use |
| NativeWind / Tailwind | ^4.2.1 | Styling | Already in use; inline style prop for dynamic hex |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ActivityIndicator (react-native) | built-in | Loading state while fetching wishlists | Use during initial data fetch |
| react-native-safe-area-context | ^5.6.1 | SafeAreaView on screen | Same as all other screens |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SectionList | FlatList with manual section headers | SectionList is purpose-built for sections; FlatList would require computing flat data with mixed types and manual section header components |
| GlueStack Toast | react-native Toast library | GlueStack Toast is already installed and wired via ToastProvider; no extra dependency |

### Installation

No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended File Structure

```
apps/gatherly-mobile/app/
├── view-wishlists.tsx           # NEW: event wishlists browse + claim screen
├── my-wishlist.tsx              # EXISTING: own wishlist CRUD (Phase 15)
├── edit-wishlist-item.tsx       # EXISTING: edit own items (Phase 15)
├── event-details.tsx            # EXISTING: wire "View Wishlists" button
├── _layout.tsx                  # EXISTING: register view-wishlists route
├── contexts/
│   └── EventsContext.tsx        # EXTEND: add CLAIM/UNCLAIM reducer actions
└── api/
    └── wishlists.ts             # EXTEND: add claim() and unclaim() methods
```

### Pattern 1: TWishlistItem Type Extension

The API `GET /api/events/:eventId/wishlists` already returns `isClaimed` and `claimedByMe` booleans. The frontend type currently only has the legacy `claimedBy?: number` and `claimedByName?: string` fields which are not populated by the actual API. Phase 16 must extend the type.

```typescript
// Source: apps/api/src/routes/wishlists.ts — actual API response shape
// Extend in: apps/gatherly-mobile/app/api/events.ts
export type TWishlistItem = {
  id: number;
  eventId: number;
  participantId: number;
  participantName?: string;
  itemName: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  priority: "low" | "medium" | "high";
  // Claim fields — returned by API, used in Phase 16
  isClaimed: boolean;       // true if any participant claimed this item
  claimedByMe: boolean;     // true only if the current authenticated participant claimed it
  // Legacy fields — keep for backward compat but not populated by current API
  claimedBy?: number;
  claimedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};
```

### Pattern 2: wishlistsApi — Claim and Unclaim Methods

The backend claim and unclaim routes exist at `POST /api/events/:eventId/wishlists/:id/claim` and `DELETE /api/events/:eventId/wishlists/:id/claim`. Add these to the wishlistsApi client:

```typescript
// Add to: apps/gatherly-mobile/app/api/wishlists.ts
// Source: apps/api/src/routes/wishlists.ts lines 299-371
claim: async (eventId: string, itemId: number): Promise<void> => {
  await apiClient.post(`/api/events/${eventId}/wishlists/${itemId}/claim`);
},

unclaim: async (eventId: string, itemId: number): Promise<void> => {
  await apiClient.delete(`/api/events/${eventId}/wishlists/${itemId}/claim`);
},
```

No body parameters needed. The backend uses `req.user.participantId` from the JWT to identify the claimant — the caller does not need to send a participantId.

### Pattern 3: EventsContext Reducer — CLAIM/UNCLAIM Actions

Add two new action types to the EventsContext reducer for optimistic updates:

```typescript
// Extend in: apps/gatherly-mobile/app/contexts/EventsContext.tsx
type EventsAction =
  // ... existing actions ...
  | { type: "CLAIM_WISHLIST_ITEM"; payload: { eventId: string; itemId: number } }
  | { type: "UNCLAIM_WISHLIST_ITEM"; payload: { eventId: string; itemId: number } };

// Reducer cases:
case "CLAIM_WISHLIST_ITEM":
  return {
    ...state,
    events: state.events.map((event) =>
      event.id === action.payload.eventId
        ? {
            ...event,
            wishlists: (event.wishlists || []).map((item) =>
              item.id === action.payload.itemId
                ? { ...item, isClaimed: true, claimedByMe: true }
                : item
            ),
          }
        : event
    ),
  };

case "UNCLAIM_WISHLIST_ITEM":
  return {
    ...state,
    events: state.events.map((event) =>
      event.id === action.payload.eventId
        ? {
            ...event,
            wishlists: (event.wishlists || []).map((item) =>
              item.id === action.payload.itemId
                ? { ...item, isClaimed: false, claimedByMe: false }
                : item
            ),
          }
        : event
    ),
  };
```

### Pattern 4: SectionList Data Structure

The screen needs to group wishlists by participant with "My Wishlist" first, then alphabetically. SectionList expects an array of `{ title, data }` objects.

```typescript
// Source: React Native SectionList built-in API
type WishlistSection = {
  participantId: number;
  title: string;   // Display name — "My Wishlist" or participant's name
  isOwn: boolean;  // true for the current user's section
  data: TWishlistItem[];
};

// Derived computation inside the screen (useMemo):
const sections = useMemo((): WishlistSection[] => {
  if (!event?.wishlists) return [];
  const allItems = event.wishlists;

  // Build a map: participantId → { name, items[] }
  const participantMap = new Map<number, { name: string; items: TWishlistItem[] }>();
  for (const item of allItems) {
    if (!participantMap.has(item.participantId)) {
      participantMap.set(item.participantId, {
        name: item.participantName ?? "Unknown",
        items: [],
      });
    }
    participantMap.get(item.participantId)!.items.push(item);
  }

  // Separate own section from others
  const result: WishlistSection[] = [];

  // My section first (if has items)
  if (myParticipantId && participantMap.has(myParticipantId)) {
    const mine = participantMap.get(myParticipantId)!;
    result.push({ participantId: myParticipantId, title: "My Wishlist", isOwn: true, data: mine.items });
    participantMap.delete(myParticipantId);
  }

  // Others alphabetically
  const others = Array.from(participantMap.entries())
    .filter(([, { items }]) => items.length > 0)  // hide empty sections
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([id, { name, items }]) => ({
      participantId: id,
      title: name,
      isOwn: false,
      data: items,
    }));

  return [...result, ...others];
}, [event?.wishlists, myParticipantId]);
```

### Pattern 5: SectionList Rendering

```typescript
// Source: React Native SectionList API
<SectionList
  sections={sections}
  keyExtractor={(item) => String(item.id)}
  renderSectionHeader={({ section }) => (
    <SectionHeader title={section.title} isOwn={section.isOwn} />
  )}
  renderItem={({ item, section }) => (
    <WishlistCard
      item={item}
      isOwn={section.isOwn}
      onLongPress={handleLongPress}
    />
  )}
  stickySectionHeadersEnabled={false}
  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
/>
```

### Pattern 6: Claim/Unclaim Optimistic Update

The same optimistic pattern as wishlist delete in Phase 15 — update context immediately, revert on API failure:

```typescript
const handleClaim = useCallback(async (item: TWishlistItem) => {
  if (!id) return;
  setActionsheetItem(null);

  // Optimistic update
  dispatch({ type: "CLAIM_WISHLIST_ITEM", payload: { eventId: id, itemId: item.id } });

  // Show toast
  toast.show({ placement: "top", render: ({ id: toastId }) => (
    <Toast nativeID={String(toastId)} action="success" variant="solid">
      <ToastTitle>Claimed!</ToastTitle>
    </Toast>
  )});

  try {
    await wishlistsApi.claim(id, item.id);
  } catch (err) {
    // Revert on failure
    dispatch({ type: "UNCLAIM_WISHLIST_ITEM", payload: { eventId: id, itemId: item.id } });
    // Show error toast
  }
}, [id, dispatch, toast]);

const handleUnclaim = useCallback(async (item: TWishlistItem) => {
  if (!id) return;
  setActionsheetItem(null);

  // Optimistic update
  dispatch({ type: "UNCLAIM_WISHLIST_ITEM", payload: { eventId: id, itemId: item.id } });

  toast.show({ placement: "top", render: ({ id: toastId }) => (
    <Toast nativeID={String(toastId)} action="muted" variant="solid">
      <ToastTitle>Unclaimed</ToastTitle>
    </Toast>
  )});

  try {
    await wishlistsApi.unclaim(id, item.id);
  } catch (err) {
    // Revert on failure
    dispatch({ type: "CLAIM_WISHLIST_ITEM", payload: { eventId: id, itemId: item.id } });
    // Show error toast
  }
}, [id, dispatch, toast]);
```

### Pattern 7: useToast — GlueStack Toast Usage

`ToastProvider` is already wrapped around the entire app in `GluestackUIProvider`. The `useToast` hook is exported from `components/ui/toast/index.tsx` and works anywhere in the tree.

```typescript
// Source: apps/gatherly-mobile/components/ui/toast/index.tsx
import { useToast, Toast, ToastTitle } from "@/components/ui/toast";

// Inside component:
const toast = useToast();

// Show a toast:
toast.show({
  placement: "top",
  duration: 2000,
  render: ({ id }) => (
    <Toast nativeID={String(id)} action="success" variant="solid">
      <ToastTitle>Claimed!</ToastTitle>
    </Toast>
  ),
});
```

Toast `action` variants available: `"error"`, `"warning"`, `"success"`, `"info"`, `"muted"`.
- Claim success: `action="success"`
- Unclaim: `action="muted"`
- Error: `action="error"`

### Pattern 8: ActionSheet Context — Differing by Item State and Ownership

The long-press behavior differs by item type:
- **Own item** → show Edit / Delete / Cancel (identical to Phase 15 `my-wishlist.tsx`)
- **Other's unclaimed item** → show Claim / Cancel
- **Other's item claimed by me** → show Unclaim / Cancel
- **Other's item claimed by someone else** → do nothing on long-press

```typescript
// Determine what to show in ActionSheet:
const handleLongPress = useCallback((item: TWishlistItem, isOwn: boolean) => {
  if (isOwn) {
    setActionsheetItem({ item, mode: "edit" });   // Edit/Delete flow
  } else if (!item.isClaimed) {
    setActionsheetItem({ item, mode: "claim" });  // Claim flow
  } else if (item.claimedByMe) {
    setActionsheetItem({ item, mode: "unclaim" }); // Unclaim flow
  }
  // item.isClaimed && !item.claimedByMe → do nothing
}, []);
```

ActionSheet state needs to carry the mode:

```typescript
type ActionsheetState = {
  item: TWishlistItem;
  mode: "edit" | "claim" | "unclaim";
} | null;

const [actionsheetItem, setActionsheetItem] = useState<ActionsheetState>(null);
```

### Pattern 9: Card Visual Treatment — Claimed vs Unclaimed vs Own

Three distinct visual states:
1. **Own item (unclaimed)**: Full opacity, no claim UI, no gray — same as Phase 15 WishlistCard
2. **Own item (claimed by someone)**: Full opacity, subtle badge/icon indicator (e.g. `CheckCircle` icon in top-right corner of card, teal colored), no "Claimed" label
3. **Other's unclaimed item**: Full opacity, normal appearance, long-press opens Claim sheet
4. **Other's claimed item (by me)**: Grayed out (`opacity-50`), "Claimed" label badge, long-press opens Unclaim sheet
5. **Other's claimed item (not by me)**: Grayed out (`opacity-50`), "Claimed" label badge, long-press does nothing

```typescript
// WishlistCard visual logic:
const showClaimedBadge = !isOwn && item.isClaimed;
const showOwnerClaimedIndicator = isOwn && item.isClaimed;
const isGrayedOut = !isOwn && item.isClaimed;
```

### Pattern 10: Data Fetch Strategy

Same two-fetch pattern as `my-wishlist.tsx` — one for participantDetails (getById) and one for wishlists (wishlistsApi.getAll). Run both in parallel on mount.

```typescript
useEffect(() => {
  if (!id) return;
  setIsLoadingParticipants(true);
  setIsLoadingWishlists(true);

  const fetchParticipants = async () => {
    try {
      const fullEvent = await eventsApi.getById(id);
      setParticipantDetails(fullEvent.participantDetails ?? []);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const fetchWishlists = async () => {
    try {
      const items = await wishlistsApi.getAll(id);
      dispatch({ type: "SET_WISHLISTS", payload: { eventId: id, items } });
    } finally {
      setIsLoadingWishlists(false);
    }
  };

  // Run in parallel — same pattern as my-wishlist.tsx
  fetchParticipants();
  fetchWishlists();
}, [id, dispatch]);
```

`wishlistsApi.getAll` returns items with `isClaimed` and `claimedByMe` already populated by the API (using `req.user.participantId` to determine `claimedByMe`).

### Pattern 11: Navigation — Route Registration and Entry Point

Route file: `apps/gatherly-mobile/app/view-wishlists.tsx`
Navigation: `router.push(`/view-wishlists?id=${event.id}`)`
Entry: Event Details screen "View Wishlists" button (currently a stub with `console.log`)

```typescript
// In _layout.tsx, add alongside my-wishlist and edit-wishlist-item:
<Stack.Screen name="view-wishlists" options={{ headerShown: false }} />

// In event-details.tsx, replace the console.log stub:
onPress={() => router.push(`/view-wishlists?id=${event.id}`)}
```

### Anti-Patterns to Avoid

- **Using FlatList for section layout**: SectionList is the correct component. A FlatList workaround requires flattening section data into a mixed array with type discrimination — more complex than SectionList with minimal benefit.
- **Building custom claim blocking UI**: Don't prevent long-press with `disabled` prop on Pressable — the GlueStack Actionsheet handles visibility. Simply skip calling `setActionsheetItem` when an item is claimed by someone else.
- **Sending participantId in claim/unclaim body**: The backend reads `req.user.participantId` from the JWT. No body parameter is needed or expected for claim/unclaim routes.
- **Mutating isClaimed on own items**: The "Claimed" grayout and label only apply to OTHER participants' items. Own items use a subtle badge indicator at full opacity. Don't share the same visual state between own and others.
- **Using SectionList sticky headers by default**: Set `stickySectionHeadersEnabled={false}` unless the user has explicitly asked for sticky section headers. Sticky headers in a single-screen scrollable list can feel heavy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom positioned View + Animated | GlueStack `useToast` | ToastProvider already wraps app; handles z-index, stacking, animation, a11y |
| Claim conflict handling | Client-side "already claimed" check before API call | Let API return 409, handle in catch | Server has `ON CONFLICT DO NOTHING` + returns 409; race conditions handled at DB level (UNIQUE constraint on wishlist_id) |
| Section grouping UI | FlatList + manual header injection | React Native SectionList | Purpose-built, handles keys, headers, separators correctly |
| One-claim-per-item enforcement | Track claims in frontend state | API's `UNIQUE(wishlist_id)` DB constraint | Atomic at DB level; client just reflects server state |

**Key insight:** The backend claiming infrastructure is complete. Phase 16 is entirely frontend work: type extension, two new API methods, two new reducer actions, and the screen UI.

---

## Common Pitfalls

### Pitfall 1: Missing Screen Template (TMPL-02 Blocker)

**What goes wrong:** The "Wishlists" screen template PNG does not exist in `screen-templates/`. Requirements TMPL-01 and TMPL-02 mandate a template before implementation. Proceeding without it violates project requirements.

**Why it happens:** The template was not created as part of Phase 15 or earlier phases.

**How to avoid:** The PLAN must include a task to request the screen template from the user as the very first step. Implementation tasks for the screen should be blocked on template delivery.

**Warning signs:** Implementing the screen UI without a template reference means guessing at the visual design.

---

### Pitfall 2: isClaimed/claimedByMe Not Populated After Local Dispatch

**What goes wrong:** When `SET_WISHLISTS` is dispatched from `wishlistsApi.getAll()`, the items have correct `isClaimed`/`claimedByMe` from the API. But when `ADD_WISHLIST_ITEM` or `UPDATE_WISHLIST_ITEM` is dispatched from Phase 15 flows, those items are created/updated with `isClaimed: false, claimedByMe: false` by default. This is correct (newly created items are unclaimed) but must be handled in the type default.

**How to avoid:** When dispatching ADD/UPDATE actions with items from the API create/update responses, the API already returns `isClaimed: false, claimedByMe: false` in those responses (verified in wishlists.ts lines 130-134). The `TWishlistItem` type needs these as non-optional (or with sensible defaults in the reducer).

---

### Pitfall 3: 409 Conflict When Two Users Claim Same Item Simultaneously

**What goes wrong:** User A and User B both see an unclaimed item. Both long-press and tap "Claim" at the same time. The DB `UNIQUE(wishlist_id)` allows only one. The second API call returns 409. The second user's UI has already been optimistically updated.

**Why it happens:** Race condition between two concurrent claim operations.

**How to avoid:** In the claim error handler, catch 409 specifically and revert the optimistic update, then refresh wishlists from the API to show the current state. Show a toast: "This item was just claimed by someone else."

```typescript
try {
  await wishlistsApi.claim(id, item.id);
} catch (err: any) {
  // Revert optimistic update
  dispatch({ type: "UNCLAIM_WISHLIST_ITEM", payload: { eventId: id, itemId: item.id } });

  if (err?.response?.status === 409) {
    // Refresh to get actual state
    const fresh = await wishlistsApi.getAll(id);
    dispatch({ type: "SET_WISHLISTS", payload: { eventId: id, items: fresh } });
    // Show "already claimed" toast
  }
}
```

---

### Pitfall 4: participantId Source — Must Use participantDetails from getById

**What goes wrong:** Using `user.id` (the auth users table ID) instead of the `participants` table ID for `myParticipantId`. These are different tables with different IDs.

**Why it happens:** Same pitfall documented in Phase 15 research. `user.id` from `useSession()` is the users table PK. The wishlists and participants tables use a separate `participants.id`.

**How to avoid:** Always derive `myParticipantId` from `eventsApi.getById(id)` → `participantDetails` → `find(p => p.name === user?.name)?.id`. The same two-fetch pattern used in `my-wishlist.tsx` applies here.

---

### Pitfall 5: Own Section Showing When Own Items Are Empty

**What goes wrong:** The "My Wishlist" section appears at the top even when the user has no wishlist items. The CONTEXT.md decision is: "Sections with zero wishlist items are hidden entirely."

**How to avoid:** In the section computation, only add the "My Wishlist" section if `mine.items.length > 0`. The useMemo logic already shows the pattern — include the early return check.

---

### Pitfall 6: SectionList keyExtractor Must Be Unique Across Sections

**What goes wrong:** `keyExtractor={(item) => String(item.id)}` could theoretically conflict if two sections somehow have items with the same ID (shouldn't happen given DB primary keys, but worth noting). The item ID is a DB primary key so this is safe.

**How to avoid:** String(item.id) is safe — wishlist item IDs are SERIAL primary keys, unique globally. No additional scoping needed.

---

### Pitfall 7: Editing Own Items Requires Navigation to edit-wishlist-item Route

**What goes wrong:** Phase 16 shows own items with the Edit/Delete ActionSheet (same as Phase 15). The Edit action navigates to `/edit-wishlist-item?id=${item.id}&eventId=${id}`. The `edit-wishlist-item.tsx` screen looks up the item from `event.wishlists` in EventsContext, which requires the wishlists to be loaded. If context is stale, the edit screen shows "Item not found."

**How to avoid:** The `view-wishlists.tsx` screen loads wishlists on mount (via `SET_WISHLISTS` dispatch), so context will be fresh before the user can long-press an item. This is safe as long as the dispatch happens before the FlatList renders.

---

## Code Examples

### Verified: API Response Shape from GET /api/events/:eventId/wishlists

```typescript
// Source: apps/api/src/routes/wishlists.ts lines 42-59
// The API response includes isClaimed and claimedByMe:
const wishlists = result.rows.map((row) => ({
  id: row.id,
  eventId: row.event_id,
  participantId: row.participant_id,
  participantName: row.participant_name,
  itemName: row.item_name,
  description: row.description,
  imageUrl: row.image_url,
  productUrl: row.product_url,
  priority: row.priority,
  sortOrder: row.sort_order,
  isClaimed: row.claimed_by !== null,            // boolean
  claimedByMe: currentParticipantId != null && currentParticipantId === row.claimed_by, // boolean
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));
```

### Verified: Claim Endpoint — No Body Required

```typescript
// Source: apps/api/src/routes/wishlists.ts lines 299-343
// POST /api/events/:eventId/wishlists/:id/claim
// Auth: req.user.participantId used as claimant — no body needed
// Returns 201 on success, 409 if already claimed, 403 if own item
// DB: ON CONFLICT (wishlist_id) DO NOTHING — atomic, race-condition safe
```

### Verified: Unclaim Endpoint — Own Claim Only

```typescript
// Source: apps/api/src/routes/wishlists.ts lines 345-371
// DELETE /api/events/:eventId/wishlists/:id/claim
// Auth: req.user.participantId used — only deletes own claim
// Returns 200 on success, 404 if no claim found by this participant
```

### Verified: wishlist_claims Table Schema

```sql
-- Source: apps/api/src/db/schema.sql
CREATE TABLE IF NOT EXISTS wishlist_claims (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    claimed_by INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id)  -- enforces one claim per item
);
```

### Verified: GlueStack Toast Provider is Active

```typescript
// Source: apps/gatherly-mobile/components/ui/gluestack-ui-provider/index.tsx
// ToastProvider wraps entire app — useToast() works in any component
import { ToastProvider } from '@gluestack-ui/core/toast/creator';

export function GluestackUIProvider({ ... }) {
  return (
    <OverlayProvider>
      <ToastProvider>{props.children}</ToastProvider>
    </OverlayProvider>
  );
}
```

### Verified: useToast Export

```typescript
// Source: apps/gatherly-mobile/components/ui/toast/index.tsx line 23
const useToast = createToastHook(MotionView, AnimatePresence);
// Exported at line 240
export { useToast, Toast, ToastTitle, ToastDescription };
```

### Verified: Actionsheet Pattern from Phase 15

```typescript
// Source: apps/gatherly-mobile/app/my-wishlist.tsx lines 295-316
// Directly reusable in Phase 16 for own-item Edit/Delete ActionSheet
<Actionsheet
  isOpen={actionsheetItem !== null}
  onClose={() => setActionsheetItem(null)}
>
  <ActionsheetBackdrop />
  <ActionsheetContent>
    <ActionsheetDragIndicatorWrapper>
      <ActionsheetDragIndicator />
    </ActionsheetDragIndicatorWrapper>
    <ActionsheetItem onPress={handleEdit}>
      <ActionsheetItemText>Edit</ActionsheetItemText>
    </ActionsheetItem>
    <ActionsheetItem onPress={handleDeletePrompt}>
      <ActionsheetItemText className="text-error-600">Delete</ActionsheetItemText>
    </ActionsheetItem>
    <ActionsheetItem onPress={() => setActionsheetItem(null)}>
      <ActionsheetItemText>Cancel</ActionsheetItemText>
    </ActionsheetItem>
  </ActionsheetContent>
</Actionsheet>
```

### Verified: Event Details "View Wishlists" Stub Location

```typescript
// Source: apps/gatherly-mobile/app/event-details.tsx lines 301-309
// The "View All Gifts" button is the stub to wire to view-wishlists:
<Button
  variant="outline"
  className="flex-1 rounded-xl border-outline-300"
  onPress={() => {
    // Stub: gifts screen not yet implemented
    console.log("View All Gifts — coming soon");
  }}
>
  <Gift size={16} color="#64748b" style={{ marginRight: 6 }} />
  <ButtonText className="text-typography-700 font-semibold">
    View All Gifts
  </ButtonText>
</Button>
```

Note: The CONTEXT.md says the entry point is "View Wishlists" button. In the current code, the button is labeled "View All Gifts". The plan should update the button label to "View Wishlists" when wiring the navigation.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TWishlistItem without isClaimed/claimedByMe | Extend type in Phase 16 | Phase 15 deferred this | Must add fields before building claim UI |
| "View All Gifts" button label | "View Wishlists" label | Phase 16 | Update label when wiring event-details |

**Deprecated/outdated:**
- `claimedBy?: number` and `claimedByName?: string` on TWishlistItem: These fields are not returned by the current wishlists API. They were in the original type definition but the actual GET endpoint returns `isClaimed` and `claimedByMe`. Keep the legacy fields for backward compat but don't rely on them.

---

## Open Questions

1. **Screen Template Delivery**
   - What we know: No "Wishlists" template exists in `screen-templates/`; TMPL-02 blocks implementation without one.
   - What's unclear: When the user will provide it and what the visual design looks like.
   - Recommendation: Make template request the first task in PLAN. All screen implementation tasks should be explicitly blocked on template delivery.

2. **"My Wishlist" Section — Edit/Delete Navigation in Phase 16**
   - What we know: Own items in the view-wishlists screen should support Edit/Delete via long-press (per CONTEXT.md). Edit navigates to `edit-wishlist-item.tsx`.
   - What's unclear: Whether the user expects the full edit experience from within the "browse" screen, or just delete.
   - Recommendation: Follow CONTEXT.md literally — long-press own items → Edit/Delete/Cancel ActionSheet, same as Phase 15. The edit route already exists.

3. **Priority Display Format on Browse Cards**
   - What we know: Cards show "item name + image thumbnail + priority" per CONTEXT.md.
   - What's unclear: Whether priority should show as a colored badge (Low/Medium/High with color coding) or plain text label.
   - Recommendation: Claude's Discretion area — use colored badges: Low=gray, Medium=amber, High=red. This provides quick visual scanning for gift givers looking for high-priority items.

4. **Empty State — No Participants Have Any Items**
   - What we know: CONTEXT.md says this is Claude's Discretion for the empty state design.
   - What's unclear: Exact copy and icon.
   - Recommendation: Show a centered Gift icon with "No wishlist items yet" heading and "Participants haven't added any items to their wishlists." subtext — mirrors the empty state pattern from `my-wishlist.tsx`.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `apps/api/src/routes/wishlists.ts` — all claim/unclaim endpoints, response shapes, DB constraints verified
- Codebase: `apps/api/src/db/schema.sql` — wishlist_claims table schema with UNIQUE(wishlist_id) constraint verified
- Codebase: `apps/gatherly-mobile/app/api/events.ts` — TWishlistItem type current definition verified
- Codebase: `apps/gatherly-mobile/app/api/wishlists.ts` — existing API methods; no claim/unclaim methods present
- Codebase: `apps/gatherly-mobile/app/contexts/EventsContext.tsx` — existing reducer actions; no CLAIM/UNCLAIM actions present
- Codebase: `apps/gatherly-mobile/app/my-wishlist.tsx` — full Phase 15 pattern reference (two-fetch, SectionList, ActionSheet, optimistic delete)
- Codebase: `apps/gatherly-mobile/app/event-details.tsx` — "View All Gifts" stub location and label
- Codebase: `apps/gatherly-mobile/app/_layout.tsx` — route registration pattern for new screens
- Codebase: `apps/gatherly-mobile/components/ui/toast/index.tsx` — useToast hook and exports verified
- Codebase: `apps/gatherly-mobile/components/ui/gluestack-ui-provider/index.tsx` — ToastProvider wraps entire app, confirmed active
- Codebase: `apps/gatherly-mobile/screen-templates/` — confirmed NO Wishlists template exists; only Details, Edit, Events, Login, Register
- Codebase: `apps/gatherly-mobile/package.json` — no new packages required; all dependencies already installed

### Secondary (MEDIUM confidence)

- React Native SectionList documentation — behavior of stickySectionHeadersEnabled and section data structure (training knowledge, consistent with observed codebase usage)

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all dependencies verified in package.json and source files; no new installs needed
- Architecture: HIGH — all patterns verified against existing codebase; backend infrastructure fully complete
- Pitfalls: HIGH — derived from observed API contracts, DB schema, and Phase 15 patterns
- Toast: HIGH — ToastProvider and useToast verified in source files

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable APIs; no fast-moving dependencies)
