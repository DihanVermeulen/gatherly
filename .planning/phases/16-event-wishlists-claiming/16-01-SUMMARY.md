---
plan: 16-01
phase: 16
subsystem: mobile-data-layer
status: complete
tags: [typescript, react-native, expo, wishlist, claiming, reducer, api]
completed: 2026-03-05

depends-on:
  requires: []
  provides:
    - TWishlistItem.isClaimed and TWishlistItem.claimedByMe fields
    - wishlistsApi.claim() and wishlistsApi.unclaim() methods
    - CLAIM_WISHLIST_ITEM and UNCLAIM_WISHLIST_ITEM reducer actions
  affects:
    - 16-02 (Wishlists screen UI — will consume these types and dispatch actions)

tech-stack:
  added: []
  patterns:
    - optimistic-reducer-update (claim/unclaim flips isClaimed+claimedByMe locally before API confirms)

key-files:
  modified:
    - apps/gatherly-mobile/app/api/events.ts
    - apps/gatherly-mobile/app/api/wishlists.ts
    - apps/gatherly-mobile/app/contexts/EventsContext.tsx

decisions:
  - isClaimed and claimedByMe are non-optional booleans in TWishlistItem — API must always return them; legacy claimedBy/claimedByName remain optional for backward compat
  - eventId typed as string in CLAIM/UNCLAIM payload — consistent with all other EventsContext action payloads
---

# Phase 16 Plan 01: Claim/Unclaim Data Layer Summary

**One-liner:** Extend TWishlistItem with isClaimed/claimedByMe fields, add wishlistsApi claim/unclaim methods, and wire CLAIM_WISHLIST_ITEM/UNCLAIM_WISHLIST_ITEM into the EventsContext reducer.

## What Was Built

- **TWishlistItem** (`app/api/events.ts`): Added `isClaimed: boolean` and `claimedByMe: boolean` fields after `priority`, before the legacy `claimedBy` optional field. Backward-compatible — existing optional fields preserved.
- **wishlistsApi** (`app/api/wishlists.ts`): Added `claim(eventId, itemId)` posting to `/api/events/:id/wishlists/:itemId/claim` and `unclaim(eventId, itemId)` deleting the same route.
- **EventsContext** (`app/contexts/EventsContext.tsx`): Added `CLAIM_WISHLIST_ITEM` and `UNCLAIM_WISHLIST_ITEM` to the `EventsAction` union type. Added matching reducer cases that map over events and wishlists to flip `isClaimed`/`claimedByMe` optimistically on the matching item.
- **screen-templates/Wishlists.png**: Confirmed present (user-provided, task 1 checkpoint cleared).

## Commits

| Hash | Message |
|------|---------|
| c0919a1 | feat(16-01): build claim/unclaim data layer |

## Deviations

None — plan executed exactly as written.

## TypeScript Status

`npx tsc --noEmit` produces zero errors in the three modified files. Pre-existing errors in `components/ui/bottomsheet`, `components/ui/table`, and unrelated hooks/contexts were present before this task and are unchanged.

## Next Phase Readiness

Plan 16-02 (Wishlists screen UI) can now:
- Import `TWishlistItem` with `isClaimed`/`claimedByMe` for conditional rendering of claim/unclaim UI
- Call `wishlistsApi.claim()` / `wishlistsApi.unclaim()` from mutation handlers
- Dispatch `CLAIM_WISHLIST_ITEM` / `UNCLAIM_WISHLIST_ITEM` for optimistic UI updates
