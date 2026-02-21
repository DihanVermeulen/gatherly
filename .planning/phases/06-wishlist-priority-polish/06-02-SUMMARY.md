---
plan: 06-02
status: complete
started: 2026-02-21T06:36:41Z
completed: 2026-02-21T06:37:48Z
commits:
  - hash: 103d027
    message: "feat(06-02): add sortOrder to WishlistItem type and reorder API function"
  - hash: bf71566
    message: "feat(06-02): add useReorderWishlistItems optimistic mutation hook"
---

## What Was Built

Frontend data layer for drag-and-drop wishlist reordering. Added `sortOrder` field to `WishlistItem`, a `wishlistsApi.reorder()` PUT function, and a `useReorderWishlistItems` hook with full optimistic update + rollback pattern matching the existing claim/unclaim hooks.

## Deliverables

- `apps/gatherly/src/api/events.ts` - `WishlistItem` type extended with `sortOrder?: number` field (after `claimedByMe`)
- `apps/gatherly/src/api/wishlists.ts` - `wishlistsApi.reorder(eventId, participantId, orderedIds)` sends PUT to `/api/events/:eventId/wishlists/reorder`
- `apps/gatherly/src/hooks/useWishlistMutations.ts` - `useReorderWishlistItems` hook exported with optimistic cache reordering, rollback on error, and invalidation on settle

## Decisions Made

- `sortOrder` placed after `claimedByMe` in `WishlistItem` type to group claim-related fields together
- `participantId` included in PUT body alongside `orderedIds` so backend can scope reorder to the correct participant's items without relying solely on URL params
- Optimistic update builds a `personalMap` keyed by item ID then maps `orderedIds` to assign sequential `sortOrder` values (1-based), keeping other participants' items unchanged
- `onSettled` debounce pattern (check `isMutating === 1`) reused from claim/unclaim hooks to prevent cache thrashing on rapid reorders

## Issues Encountered

None - plan executed exactly as written. TypeScript compiled cleanly after both changes.
