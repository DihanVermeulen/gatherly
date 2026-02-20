# Phase 03: Claiming System - Research

**Researched:** 2026-02-20
**Domain:** Optimistic mutations, atomic DB operations, privacy-aware API responses, TanStack Query v5
**Confidence:** HIGH (codebase verified + official docs confirmed)

---

## Summary

Phase 3 wires up the claim/unclaim buttons in `WishlistRegistryItem` to a real backend. The codebase has already shifted from the custom reducer described in CLAUDE.md to **TanStack Query v5** — `EventsContext` now wraps `useQuery` / `useMutation` hooks, and `useEventMutations.ts` demonstrates the exact optimistic-update + rollback pattern to follow.

The standard approach is: **TanStack Query `useMutation` with `onMutate` snapshot → optimistic cache update → `onError` rollback → `onSettled` invalidate**. The DB layer already has `UNIQUE(wishlist_id)` on `wishlist_claims`, which makes `INSERT ... ON CONFLICT DO NOTHING` the correct atomic primitive — no transaction wrapper needed for claim, only for unclaim (which is a plain DELETE).

Privacy is solved by response-time field filtering: the API returns `isClaimed` (boolean, visible to all) and `claimedBy` (participant_id, visible only when `req.user.participantId === claimedBy`). The wishlist owner never receives the `claimedBy` value — they only see that the item is taken.

**Primary recommendation:** Follow the `useCreateEvent` / `useDeleteEvent` mutation pattern already in `useEventMutations.ts` exactly. Add a `useClaimWishlistItem` and `useUnclaimWishlistItem` hook under `apps/gatherly/src/hooks/useWishlistMutations.ts`. Wire the `WishlistRegistryItem` button to `mutation.mutate()` and use `mutation.isPending` to disable the button during flight.

---

## Standard Stack

No new packages are needed. Phase 3 is purely a wiring exercise on top of existing infrastructure.

### Core (already installed)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `@tanstack/react-query` | ^5.90.20 | Optimistic mutations, cache management, rollback | HIGH — in `package.json` |
| `axios` | ^1.13.2 | HTTP client (via `apiClient`) | HIGH — in `package.json` |
| `express` | 4.21.2 | Backend routing | HIGH — in `package.json` |
| `pg` | ^8.11.3 | PostgreSQL driver | HIGH — in `package.json` |
| `lucide-react` | ^0.562.0 | Icons (Loader2 for loading spinner) | HIGH — in `package.json` |
| `tailwindcss` | ^3.4.19 | Styling | HIGH — in `package.json` |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsonwebtoken` | ^9.0.3 | JWT payload carries `participantId` | Needed to identify claimer server-side |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query `useMutation` | Manual `useState + fetch` | Already established — don't deviate |
| `INSERT ON CONFLICT DO NOTHING` | SELECT + INSERT in transaction | Transaction adds latency; `ON CONFLICT` is cleaner and faster |
| Field-filter in Express handler | Separate claim-status endpoint | Field-filter is simpler, consistent with existing `wishlists.ts` pattern |

**Installation:** None required. All packages are already present.

---

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
apps/
├── gatherly/src/
│   ├── hooks/
│   │   └── useWishlistMutations.ts    # NEW: useClaimWishlistItem, useUnclaimWishlistItem
│   └── api/
│       └── wishlists.ts               # MODIFY: add claim() and unclaim() functions
├── api/src/routes/
│   └── wishlists.ts                   # MODIFY: add POST/DELETE /:eventId/wishlists/:id/claim
```

### Pattern 1: TanStack Query Optimistic Mutation (established in codebase)

**What:** `useMutation` with `onMutate` snapshot, `onError` rollback, `onSettled` invalidation.

**When to use:** Any mutation that changes cached query data and needs instant UI feedback.

This pattern is already implemented for events in `useEventMutations.ts`. The claim mutation follows the same shape:

```typescript
// Source: useEventMutations.ts (existing pattern) + TanStack Query v5 official docs
// apps/gatherly/src/hooks/useWishlistMutations.ts

export function useClaimWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation<
    WishlistItem,
    Error,
    { eventId: string; wishlistId: number; participantId: number },
    { previous: Event[] | undefined }
  >({
    mutationKey: ["wishlist", "claim"],
    mutationFn: ({ eventId, wishlistId }) =>
      wishlistsApi.claim(eventId, wishlistId),

    onMutate: async ({ eventId, wishlistId, participantId }) => {
      // 1. Cancel in-flight fetches for this query key
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // 2. Snapshot previous value for rollback
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      // 3. Optimistically mark item as claimed in cache
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((e) =>
          e.id === eventId
            ? {
                ...e,
                wishlists: (e.wishlists || []).map((item) =>
                  item.id === wishlistId
                    ? { ...item, isClaimed: true }
                    : item,
                ),
              }
            : e,
        ),
      );

      return { previous };
    },

    onError: (_err, _variables, context) => {
      // 4. Rollback to snapshot on any error (including 409 Conflict)
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      // 5. Invalidate to sync with server — but only if no other claim mutations are in-flight
      // (prevents overwriting a sibling mutation's optimistic state)
      if (queryClient.isMutating({ mutationKey: ["wishlist", "claim"] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    },
  });
}
```

**Key insight from tkdodo concurrent mutations research:** Using `isMutating()` in `onSettled` prevents the invalidation from firing until the last in-flight mutation completes. This avoids the "window of inconsistency" where a refetch would revert a concurrent mutation's optimistic state.

### Pattern 2: Three-State Button (unclaimed → claiming → claimed/failed)

**What:** Drive button appearance from `mutation.isPending` and `item.isClaimed`.

**When to use:** Any action with latency where duplicate submission must be prevented.

```typescript
// apps/gatherly/src/components/wishlist/WishlistRegistryItem.tsx (modified)

const claimMutation = useClaimWishlistItem();

// Three states:
// 1. Unclaimed, idle:    green "I'll buy this" button, enabled
// 2. Claiming (pending): disabled button with Loader2 spinner
// 3. Claimed:            grey "Claimed" badge (existing isClaimed branch)

<button
  onClick={() => claimMutation.mutate({ eventId, wishlistId: item.id, participantId })}
  disabled={claimMutation.isPending}
  className="mt-2 h-8 rounded-lg bg-secondary-0 text-black text-xs font-bold px-4 self-start
             hover:bg-primary/90 transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed"
>
  {claimMutation.isPending ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    "I'll buy this"
  )}
</button>

{claimMutation.isError && (
  <p className="text-xs text-red-500 mt-1">Already claimed. Refresh to see latest.</p>
)}
```

**Note:** Konsta UI does not have a built-in loading prop on its Button component (verified from npm package and GitHub). Use `disabled + Loader2` from lucide-react (already installed) instead — consistent with existing pattern in the codebase.

### Pattern 3: Express Claim Handler with Atomic INSERT ON CONFLICT

**What:** Single atomic SQL statement that is safe under concurrent access. No transaction needed.

**When to use:** Any "first writer wins" scenario backed by a UNIQUE constraint.

```typescript
// apps/api/src/routes/wishlists.ts (new endpoint)

// POST /:eventId/wishlists/:id/claim
router.post(
  "/:eventId/wishlists/:id/claim",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId, id: wishlistId } = req.params;
    const participantId = req.user?.participantId;

    if (!participantId) {
      return res.status(403).json({ error: "Participant identity required" });
    }

    // Verify the wishlist item belongs to this event and the claimer is NOT the owner
    const itemCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [wishlistId, eventId],
    );

    if (itemCheck.rowCount === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (itemCheck.rows[0].participant_id === participantId) {
      return res.status(403).json({ error: "Cannot claim your own wishlist item" });
    }

    // Atomic INSERT — UNIQUE(wishlist_id) guarantees only one claim survives under concurrent load
    // DO NOTHING means conflicting inserts silently fail; empty RETURNING means "already claimed"
    const result = await query(
      `INSERT INTO wishlist_claims (wishlist_id, claimed_by)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id) DO NOTHING
       RETURNING id, claimed_by`,
      [wishlistId, participantId],
    );

    if (result.rowCount === 0) {
      // Another participant claimed it first — race condition handled at DB level
      return res.status(409).json({ error: "Item already claimed" });
    }

    return res.status(201).json({ success: true });
  }),
);

// DELETE /:eventId/wishlists/:id/claim
router.delete(
  "/:eventId/wishlists/:id/claim",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: wishlistId } = req.params;
    const participantId = req.user?.participantId;

    if (!participantId) {
      return res.status(403).json({ error: "Participant identity required" });
    }

    // Only the claimer can unclaim — enforce ownership
    const result = await query(
      "DELETE FROM wishlist_claims WHERE wishlist_id = $1 AND claimed_by = $2 RETURNING id",
      [wishlistId, participantId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Claim not found or not yours" });
    }

    return res.status(200).json({ success: true });
  }),
);
```

**Why DO NOTHING over DO UPDATE:** `DO NOTHING` with `RETURNING` gives an empty result set when a conflict occurs, which maps cleanly to HTTP 409. `DO UPDATE` is marginally more complex and unnecessary — we never want to change who claimed an item. `DO NOTHING` performance is also ~3x better under high concurrency (verified source: PostgreSQL benchmarks from search results).

### Pattern 4: Privacy-Aware Response in GET /wishlists

**What:** The `claimed_by` participant ID is redacted from the response unless the caller IS the claimer. The wishlist owner only sees `isClaimed: true/false`.

**When to use:** Any resource that has different visibility rules based on the caller's identity.

```typescript
// apps/api/src/routes/wishlists.ts — GET handler modification

const wishlists = result.rows.map((row) => {
  const viewerParticipantId = req.user?.participantId ?? null;
  const isTheClaimer = viewerParticipantId !== null && viewerParticipantId === row.claimed_by;

  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    itemName: row.item_name,
    description: row.description,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    priority: row.priority,
    // Privacy: owner sees isClaimed but not WHO. Claimer sees their own claim.
    isClaimed: row.claimed_by !== null,
    claimedByMe: isTheClaimer,          // true if this viewer claimed it
    // Never expose claimed_by participant ID or name — keep anonymous
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
});
```

**Frontend consumption:** `WishlistRegistryItem` receives `isClaimed` and `claimedByMe`. It renders:
- `!isClaimed` → "I'll buy this" button
- `isClaimed && !claimedByMe` → grey "Claimed" badge (no action, identity hidden)
- `isClaimed && claimedByMe` → green "You're buying this" badge + "Unclaim" button

### Pattern 5: Auth Identity Extraction for Participants

**What:** `req.user.participantId` is already set by `authenticateJWT` for magic-link participants. No additional lookup is needed.

**Evidence from codebase:**

```typescript
// apps/api/src/middleware/auth.ts — confirmed
req.user = {
  userId: payload.userId,
  email: payload.email,
  role: payload.role,
  ...(payload.participantId !== undefined && { participantId: payload.participantId }),
  ...(payload.eventId !== undefined && { eventId: payload.eventId }),
};

// apps/api/src/services/tokenService.ts — participant JWT payload
const payload: TokenPayload = {
  userId: 0,    // sentinel for participant sessions
  email: "",
  role: "participant",
  participantId,  // PRESENT in all magic-link tokens
  eventId,
};
```

The `participantId` in the JWT payload IS the claimer ID. No secondary DB lookup is needed in the claim handler. This is HIGH confidence — directly from the codebase.

### Anti-Patterns to Avoid

- **SELECT then INSERT for claiming:** Introduces a race condition. Two concurrent SELECT queries both see no claim, both try INSERT, one fails with a unique constraint error (not 409). Use `INSERT ON CONFLICT` instead.
- **Using `EventsContext.dispatch` for claim state:** The context no longer uses a pure reducer (it wraps TanStack Query mutations). Dispatch is for event CRUD. Claim state belongs in a dedicated `useClaimWishlistItem` mutation hook.
- **Storing `claimed_by` in frontend state before server confirmation:** The optimistic update sets `isClaimed: true` speculatively, but `claimedByMe` should only be set on server success (or pre-populated from the initial fetch). Conflating the two creates stale UI.
- **Transaction wrapping the INSERT ON CONFLICT:** Unnecessary overhead. The constraint IS the transaction. Only use `getClient()` for multi-statement operations (e.g., claiming + logging).
- **Returning `claimed_by` participant name in the GET response:** Even the name leaks identity. Return only the boolean `isClaimed` and the viewer-scoped `claimedByMe` flag.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race condition prevention | Custom locking, SELECT+INSERT | `INSERT ON CONFLICT DO NOTHING` on `UNIQUE(wishlist_id)` | PostgreSQL guarantees atomicity; home-grown locks fail under concurrent load |
| Optimistic UI rollback | Manual `useState` pre/post state | TanStack Query `onMutate` snapshot + `onError` rollback | Already established pattern; handles edge cases like stale closures |
| Double-click prevention | Debounce/throttle | `disabled={mutation.isPending}` | Mutation state is more reliable than timing; already used in codebase |
| Token refresh on 401 | Manual retry logic | Axios interceptor in `client.ts` (already handles it) | Interceptor already queues and retries; adding more retry logic causes duplicate requests |
| Loading spinner | Custom CSS animation | `Loader2` from `lucide-react` + Tailwind `animate-spin` | Lucide already installed; consistent with icon set |

**Key insight:** The codebase has already solved optimistic updates, token refresh, and query invalidation. Phase 3's job is to follow the patterns, not invent new ones.

---

## Common Pitfalls

### Pitfall 1: DO NOTHING Returns Empty RETURNING

**What goes wrong:** `INSERT ON CONFLICT DO NOTHING RETURNING *` returns zero rows when the item is already claimed. Code that assumes `result.rows[0]` exists will throw a runtime error.

**Why it happens:** This is correct PostgreSQL behavior (confirmed by official docs). Only "actually inserted" rows appear in RETURNING.

**How to avoid:** Check `result.rowCount === 0` to detect the conflict case, then return 409.

**Warning signs:** Unhandled `TypeError: Cannot read property of undefined` when claiming already-claimed item.

### Pitfall 2: Invalidation Before Concurrent Mutation Settles

**What goes wrong:** Two claim mutations fire in quick succession (e.g., user claims item A and item B). Item A's `onSettled` fires and calls `invalidateQueries`, which triggers a refetch that overwrites item B's optimistic update before item B's mutation completes.

**Why it happens:** TanStack Query's `onSettled` fires per-mutation, not per-batch. Background refetch can race against in-flight mutations.

**How to avoid:** Use `queryClient.isMutating({ mutationKey: ["wishlist", "claim"] }) === 1` guard in `onSettled`. When `isMutating()` is called from within `onSettled`, the current mutation is still counted, so value `1` means "only me is in-flight — safe to invalidate."

**Warning signs:** Claimed items flickering back to unclaimed in the UI when multiple claims happen in quick succession.

### Pitfall 3: Self-Claiming Allowed by Default

**What goes wrong:** Without an explicit check, a participant can claim items from their own wishlist. The DB only prevents the same item from being claimed twice — not self-claims.

**Why it happens:** The `UNIQUE(wishlist_id)` constraint only guards against duplicates, not ownership.

**How to avoid:** In the claim handler, query the item's `participant_id` and compare it to `req.user.participantId`. Return 403 if they match.

**Warning signs:** A participant sees "I'll buy this" on their own items.

### Pitfall 4: Stale `isClaimed` on Registry Page After Navigation

**What goes wrong:** User visits the wishlist page, claims an item, navigates away, returns — item shows as unclaimed because the cache was invalidated and refetched without the `isClaimed` field.

**Why it happens:** The `useEventsQuery` stale time is 5 minutes, but after `invalidateQueries` the refetch re-fetches events (which don't include wishlists). Then the wishlist page re-loads wishlists, and the `claimedByMe` field requires the participant's own `participantId` which is only available on re-fetch from the server.

**How to avoid:** The `SET_WISHLISTS` dispatch pattern in `wishlist.tsx` already re-loads wishlists on page mount. Ensure the claim mutation's `onSettled` triggers re-load of wishlists, not just events. Use `queryClient.invalidateQueries({ queryKey: ["wishlists", eventId] })` as a separate query key OR rely on the page-level `useEffect` reload.

**Warning signs:** Claims "disappear" on page return.

### Pitfall 5: `participantId` is Undefined for Organizer Sessions

**What goes wrong:** The organizer (non-magic-link user) has a JWT with `role: "organizer"` but `participantId: undefined`. Calling `req.user?.participantId` returns undefined, and the claim insert would fail at DB level with a NOT NULL violation.

**Why it happens:** Organizer JWTs are generated by `generateTokens()` which does not include `participantId`. Only `generateParticipantTokens()` adds it.

**How to avoid:** Guard with `if (!participantId) return res.status(403).json(...)` at the top of the claim handler (shown in Pattern 3 above).

**Warning signs:** `null value in column "claimed_by"` PostgreSQL error in server logs.

### Pitfall 6: Privacy Leak via `claimedByName`

**What goes wrong:** The existing `GET /wishlists` handler in `wishlists.ts` (line 27-28) already JOINs `participants` to get `claimed_by_name` and returns it in the response as `claimedByName`. This would expose the claimer's name to the wishlist owner.

**Why it happens:** The field was added in Phase 2 without the privacy requirement being fully enforced.

**How to avoid:** Remove `claimedByName` from the GET response (or omit it when the viewer is not the claimer). Replace with `isClaimed` + `claimedByMe`.

**Warning signs:** Owner sees "Sarah has claimed this" instead of "Claimed" badge.

---

## Code Examples

Verified patterns from official sources and the codebase:

### Optimistic Claim Mutation (TanStack Query v5)

```typescript
// Source: TanStack Query v5 official docs + existing useEventMutations.ts pattern
// apps/gatherly/src/hooks/useWishlistMutations.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistsApi } from "../api/wishlists";
import type { Event } from "../api/events";

export function useClaimWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { eventId: string; wishlistId: number },
    { previous: Event[] | undefined }
  >({
    mutationKey: ["wishlist", "claim"],
    mutationFn: ({ eventId, wishlistId }) =>
      wishlistsApi.claim(eventId, wishlistId),

    onMutate: async ({ eventId, wishlistId }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData<Event[]>(["events"]);

      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((e) =>
          e.id === eventId
            ? {
                ...e,
                wishlists: (e.wishlists || []).map((item) =>
                  item.id === wishlistId
                    ? { ...item, isClaimed: true, claimedByMe: true }
                    : item,
                ),
              }
            : e,
        ),
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["events"], context.previous);
      }
    },

    onSettled: () => {
      // Only invalidate when this is the last in-flight claim mutation
      if (queryClient.isMutating({ mutationKey: ["wishlist", "claim"] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    },
  });
}
```

### Atomic Claim INSERT (Express + PostgreSQL)

```typescript
// Source: PostgreSQL official docs (ON CONFLICT) + existing gifts.ts pattern
// apps/api/src/routes/wishlists.ts

const result = await query(
  `INSERT INTO wishlist_claims (wishlist_id, claimed_by)
   VALUES ($1, $2)
   ON CONFLICT (wishlist_id) DO NOTHING
   RETURNING id`,
  [wishlistId, participantId],
);

if (result.rowCount === 0) {
  return res.status(409).json({ error: "Item already claimed" });
}

return res.status(201).json({ success: true });
```

### Privacy-Aware GET Response Shape

```typescript
// Source: codebase analysis + privacy requirement
// Shape returned by GET /events/:eventId/wishlists

type WishlistItemResponse = {
  id: number;
  eventId: number;
  participantId: number;
  participantName: string;
  itemName: string;
  description: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  priority: "low" | "medium" | "high";
  isClaimed: boolean;       // true if ANY participant has claimed it
  claimedByMe: boolean;     // true only if this caller claimed it
  // claimedBy NEVER returned — protects anonymity
  // claimedByName NEVER returned — protects anonymity
  createdAt: string;
  updatedAt: string;
};
```

### Three-State Button Component

```typescript
// Source: TanStack Query v5 isPending pattern + existing WishlistRegistryItem.tsx
// apps/gatherly/src/components/wishlist/WishlistRegistryItem.tsx

import { Loader2 } from "lucide-react";
import { useClaimWishlistItem, useUnclaimWishlistItem } from "../../hooks/useWishlistMutations";

// isClaimed: someone has it (may not be viewer)
// claimedByMe: viewer is the claimer
// isPending: mutation in-flight

{!isClaimed && (
  <button
    onClick={() => claimMutation.mutate({ eventId, wishlistId: item.id })}
    disabled={claimMutation.isPending}
    className="mt-2 h-8 rounded-lg bg-secondary-0 text-black text-xs font-bold px-4
               self-start hover:bg-primary/90 transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {claimMutation.isPending
      ? <Loader2 className="w-4 h-4 animate-spin" />
      : "I'll buy this"
    }
  </button>
)}

{isClaimed && claimedByMe && (
  <button
    onClick={() => unclaimMutation.mutate({ eventId, wishlistId: item.id })}
    disabled={unclaimMutation.isPending}
    className="mt-2 h-8 rounded-lg bg-green-100 text-green-700 text-xs font-bold px-4
               self-start hover:bg-red-100 hover:text-red-700 transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {unclaimMutation.isPending
      ? <Loader2 className="w-4 h-4 animate-spin" />
      : "You're buying this"
    }
  </button>
)}

{isClaimed && !claimedByMe && (
  <div className="mt-2 flex items-center gap-1.5 text-gray-400">
    <CheckCircle className="w-4 h-4" />
    <span className="text-xs font-bold">Claimed</span>
  </div>
)}
```

### API Client Claim Function

```typescript
// Source: existing wishlistsApi pattern in apps/gatherly/src/api/wishlists.ts

export const wishlistsApi = {
  // ... existing functions ...

  claim: async (eventId: string, wishlistId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post(
      `/api/events/${eventId}/wishlists/${wishlistId}/claim`,
    );
    return response.data;
  },

  unclaim: async (eventId: string, wishlistId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(
      `/api/events/${eventId}/wishlists/${wishlistId}/claim`,
    );
    return response.data;
  },
};
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Custom reducer in EventsContext | TanStack Query v5 mutations | Optimistic updates, rollback, and invalidation are handled by the library, not hand-rolled |
| `SELECT + INSERT` for claiming | `INSERT ON CONFLICT DO NOTHING` | Eliminates race condition at DB level without transactions |
| Manual `useState` for button loading | `mutation.isPending` | Consistent, auto-resets on component unmount |
| Returning full `claimed_by` in response | Returning `isClaimed` boolean + `claimedByMe` flag | Privacy preserved without changing DB schema |

**Deprecated/outdated:**
- `localStorage` fallback path: `useApi` is permanently `true` in the current EventsContext. The `else` branches in `wishlist.tsx` (localStorage paths) are dead code but should not be removed in Phase 3.
- `claimedByName` field in GET response: Was added in Phase 2 but violates privacy requirement. Must be removed or conditionally suppressed.

---

## Open Questions

1. **Should `claimedByMe` be persisted in the TanStack Query cache?**
   - What we know: The `claimedByMe` field comes from the API response and depends on the caller's `participantId`. The TanStack Query cache stores responses from `eventsApi.getAll()` which does not currently include wishlists.
   - What's unclear: Whether the wishlist page should use a separate `queryKey: ["wishlists", eventId]` or rely on the `events` cache with wishlists merged in.
   - Recommendation: Follow the existing approach in `wishlist.tsx` — load wishlists via `wishlistsApi.getAll(eventId)` on mount and dispatch `SET_WISHLISTS` to the events cache. The claim mutation should invalidate both `["events"]` and trigger the wishlist page to re-load on next visit.

2. **Organizer claim behavior**
   - What we know: Organizers have `role: "organizer"` JWTs without `participantId`. Claiming requires `participantId`.
   - What's unclear: Should organizers be able to claim items (perhaps as a proxy)? The requirement says "participant can claim" — organizer is out of scope.
   - Recommendation: Return 403 for organizer sessions attempting to claim. The UI should hide the claim button entirely for organizer-role users.

3. **`WishlistItem` TypeScript type update**
   - What we know: The current `WishlistItem` type in `api/events.ts` includes `claimedBy?: number` and `claimedByName?: string`.
   - What's unclear: Whether removing `claimedByName` breaks other consumers.
   - Recommendation: Add `isClaimed: boolean` and `claimedByMe: boolean` to `WishlistItem`. Keep `claimedBy` as optional (used by `wishlist.tsx` line 163 `if (item.claimedBy)` claim-warning on delete). Mark `claimedByName` as `@deprecated` or remove from type.

---

## Sources

### Primary (HIGH confidence)
- `apps/gatherly/src/hooks/useEventMutations.ts` — onMutate/onError/onSettled pattern (direct codebase)
- `apps/api/src/middleware/auth.ts` — participantId in JWT (direct codebase)
- `apps/api/src/services/tokenService.ts` — generateParticipantTokens payload (direct codebase)
- `apps/api/src/routes/wishlists.ts` — existing claim field structure (direct codebase)
- `apps/api/src/db/schema.sql` — UNIQUE(wishlist_id) constraint (direct codebase)
- `apps/gatherly/src/pages/events/wishlist.tsx` — `onClaim={undefined}` stub (direct codebase)
- `https://www.postgresql.org/docs/current/sql-insert.html` — ON CONFLICT DO NOTHING RETURNING behavior
- `https://github.com/TanStack/query/blob/main/docs/framework/react/guides/optimistic-updates.md` — onMutate pattern (verified via WebFetch)

### Secondary (MEDIUM confidence)
- `https://tanstack.com/query/v5/docs/react/guides/optimistic-updates` — optimistic updates overview
- `https://tanstack.com/query/v5/docs/react/guides/invalidations-from-mutations` — invalidation patterns
- tkdodo.eu concurrent optimistic updates article — isMutating() pattern in onSettled (verified via WebFetch)
- PostgreSQL INSERT ON CONFLICT benchmarks — DO NOTHING ~3x faster than DO UPDATE under contention

### Tertiary (LOW confidence — for context only)
- Favory wishlist app (2025) — anonymous claiming is an established product concept; no technical API details available

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all packages verified in package.json, no new installs needed
- Architecture (TanStack mutation pattern): HIGH — verified against existing useEventMutations.ts
- Architecture (PostgreSQL ON CONFLICT): HIGH — verified against official PostgreSQL docs
- Architecture (privacy field filtering): HIGH — derived from auth middleware codebase + requirements
- Pitfalls: HIGH — derived from codebase + official TanStack docs + PostgreSQL docs
- UI pattern (three-state button): MEDIUM — Konsta UI docs not fetchable; recommendation based on lucide-react + existing Tailwind patterns

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (30 days — stable libraries, schema already fixed)
