---
phase: 03
plan: 02
subsystem: wishlist-claiming
tags: [react, tanstack-query, optimistic-updates, mutations, typescript]
requires: ["03-01"]
provides: ["claim-ui", "unclaim-ui", "optimistic-claim-mutations"]
affects: ["future-claim-history", "notification-phases"]
tech-stack:
  added: []
  patterns: ["optimistic-mutation-with-rollback", "three-state-ui-component"]
key-files:
  created:
    - apps/gatherly/src/hooks/useWishlistMutations.ts
  modified:
    - apps/gatherly/src/api/wishlists.ts
    - apps/gatherly/src/components/wishlist/WishlistRegistryItem.tsx
    - apps/gatherly/src/pages/events/wishlist.tsx
decisions:
  - "isMutating guard on onSettled prevents cache thrashing during concurrent claim/unclaim mutations"
  - "Global isPending on WishlistRegistryItem (not per-item) — optimistic update handles visual state immediately"
  - "Read isClaimed and claimedByMe from item directly, not as separate props"
metrics:
  duration: "3.3 minutes"
  completed: "2026-02-20"
---

# Phase 3 Plan 02: Frontend Claiming UI Summary

**One-liner:** Optimistic claim/unclaim mutations with three-state button (available, claimed-by-me, claimed-by-other) and automatic 409-conflict rollback.

## What Was Built

Participants can now claim and unclaim wishlist items with instant visual feedback. The UI optimistically updates the cache before the server confirms, and rolls back automatically if the server returns a 409 conflict (double-claim race condition) or any other error.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add claim/unclaim API functions and mutation hooks | c2372b0 | wishlists.ts, useWishlistMutations.ts (new) |
| 2 | Three-state button and wire wishlist page | c50136e | WishlistRegistryItem.tsx, wishlist.tsx |

## Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| isMutating guard on onSettled | Only invalidate queries when last in-flight mutation settles, preventing redundant cache busting during rapid claim/unclaim sequences | Good — reduces unnecessary refetches |
| Global isPending per registry render (not per-item) | Optimistic update handles visual state change immediately; spinner appears only during actual network delay | Good — simpler code with adequate UX |
| Read isClaimed/claimedByMe from item directly | Removes prop drilling duplication; item is already the source of truth in cache | Good — cleaner component API |
| Green border highlight for "claimed by me" state | Differentiates from grey "claimed by other" to reinforce ownership | Good — visual distinction without excessive decoration |

## Deviations from Plan

None — plan executed exactly as written.

## What Was Verified

- TypeScript type check passes with no errors
- gatherly app builds successfully (194 kB gzipped bundle)
- No `onClaim={undefined}` stub remaining in wishlist.tsx
- WishlistRegistryItem handles all three states: available, claimed-by-me, claimed-by-other
- Both hooks export correctly from useWishlistMutations.ts
- wishlists.ts API client has claim() and unclaim() methods

## Next Phase Readiness

Phase 3 is complete. The full claiming lifecycle is wired:
- Backend: POST/DELETE `/api/events/:id/wishlists/:wishlistId/claim` endpoints (03-01)
- Frontend: Optimistic mutations with rollback (03-02)
- UI: Three-state button reflecting claim ownership

No blockers for future phases.
