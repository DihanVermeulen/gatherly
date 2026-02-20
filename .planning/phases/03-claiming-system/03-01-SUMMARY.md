---
phase: 03
plan: 01
subsystem: claiming-system
tags: [wishlist, claims, privacy, api, typescript]
requires: [02-wishlist-core]
provides: [claim-endpoints, privacy-safe-get]
affects: [03-02-frontend-claiming]
tech-stack:
  added: []
  patterns: [ON CONFLICT DO NOTHING atomicity, privacy-aware response shaping]
key-files:
  created: []
  modified:
    - apps/api/src/routes/wishlists.ts
    - apps/gatherly/src/api/events.ts
    - apps/gatherly/src/pages/events/wishlist.tsx
decisions:
  - "ON CONFLICT DO NOTHING for atomic claim insert — prevents race conditions without transactions"
  - "participantId check for organizer guard — req.user.participantId absent on organizer sessions"
  - "isClaimed/claimedByMe booleans replace claimedBy/claimedByName — privacy leak fixed at API layer"
metrics:
  duration: 3m
  completed: 2026-02-20
---

# Phase 3 Plan 1: Claim Endpoints and Privacy Fix Summary

**One-liner:** Atomic POST/DELETE claim routes with ON CONFLICT DO NOTHING plus isClaimed/claimedByMe privacy-safe response replacing leaked claimedByName.

## What Was Built

Two new API routes for claiming wishlist items and a privacy fix on all GET/POST/PUT wishlist responses.

### Backend (apps/api/src/routes/wishlists.ts)

**POST /:eventId/wishlists/:id/claim**
- Organizer guard: returns 403 if `req.user.participantId` is absent
- Self-claim guard: queries wishlist owner, returns 403 if owner matches claimer
- Atomic insert: `INSERT INTO wishlist_claims ... ON CONFLICT (wishlist_id) DO NOTHING RETURNING id`
- Returns 409 if rowCount === 0 (already claimed by someone else)
- Returns 201 `{ success: true }` on success

**DELETE /:eventId/wishlists/:id/claim**
- Organizer guard: same participantId check
- Scoped delete: `DELETE FROM wishlist_claims WHERE wishlist_id = $1 AND claimed_by = $2`
- Returns 404 if rowCount === 0 (no own claim to remove)
- Returns 200 `{ success: true }` on success

**Privacy fix on GET/POST/PUT responses**
- Removed: `claimedBy` (participant ID), `claimedByName` (participant name) — privacy leak
- Added: `isClaimed: boolean` (visible to all, true if any claim exists)
- Added: `claimedByMe: boolean` (true only for the claimer themselves)
- GET response no longer joins participants table for claimed_by_name
- POST create hardcodes `isClaimed: false, claimedByMe: false`
- PUT update fetches `claimed_by` and compares to `req.user.participantId`

### Frontend (apps/gatherly/src/api/events.ts)

Updated `WishlistItem` type:
- Removed: `claimedBy?: number`, `claimedByName?: string`
- Added: `isClaimed: boolean`, `claimedByMe: boolean` (both required)

### Frontend (apps/gatherly/src/pages/events/wishlist.tsx)

- `handleDelete`: `item.claimedBy` → `item.isClaimed`
- `WishlistRegistryItem` prop: `!!item.claimedBy` → `item.isClaimed`
- localStorage fallback: added `isClaimed: false, claimedByMe: false` to satisfy required fields

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| ON CONFLICT DO NOTHING over transaction | Single-row conflict handled at DB constraint level; no need for explicit BEGIN/COMMIT |
| participantId guard for organizer | Organizer JWTs have no participantId field; absence is the signal |
| Required (not optional) isClaimed/claimedByMe | Forces all code paths to provide claim state explicitly; catches the localStorage fallback gap |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LocalStorage fallback missing required isClaimed/claimedByMe fields**

- **Found during:** Task 2 type checking
- **Issue:** The LocalStorage fallback at wishlist.tsx line 129 constructed a `WishlistItem` literal without `isClaimed` or `claimedByMe`, which became required fields after the type update
- **Fix:** Added `isClaimed: false, claimedByMe: false` to the localStorage fallback object
- **Files modified:** `apps/gatherly/src/pages/events/wishlist.tsx`
- **Commit:** f273c4d

## Verification Results

- `pnpm check-types` passes for API package (turbo cache)
- Direct `tsc --noEmit` on gatherly frontend passes (no cache)
- No `claimedByName` anywhere in `apps/gatherly/src/`
- No `claimedBy` in `apps/gatherly/src/api/events.ts` (only `claimedByMe`)
- `ON CONFLICT (wishlist_id) DO NOTHING` present in claim insert
- Self-claim guard: 403 when `participant_id === currentParticipantId`
- Organizer guard: 403 when `req.user.participantId` is falsy

## Next Phase Readiness

**Ready for:** 03-02 (frontend claiming UI) — backend endpoints are live, types are aligned.

**Key contracts established:**
- `POST /:eventId/wishlists/:id/claim` → 201 success | 409 conflict | 403 forbidden
- `DELETE /:eventId/wishlists/:id/claim` → 200 success | 404 not found | 403 forbidden
- `WishlistItem.isClaimed` and `WishlistItem.claimedByMe` are now required booleans
