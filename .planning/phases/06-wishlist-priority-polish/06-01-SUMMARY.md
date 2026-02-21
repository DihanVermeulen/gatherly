---
plan: 06-01
status: complete
started: 2026-02-21T06:36:13Z
completed: 2026-02-21T06:41:49Z
duration: 5 minutes
commits:
  - hash: e158ab6
    message: "chore(06-01): add sort_order column and index to wishlists schema"
  - hash: 78417b7
    message: "feat(06-01): update GET ordering and add PUT reorder endpoint for wishlists"
---

# Phase 06 Plan 01: sort_order Migration and Reorder Endpoint Summary

**One-liner:** Added sort_order INTEGER column to wishlists table with backfill, composite index, and PUT /reorder endpoint with ownership validation and transaction-safe bulk updates.

## What Was Built

Backend foundation for drag-and-drop wishlist reordering. The wishlists table gained a `sort_order` column, existing rows were backfilled with sequential values partitioned by participant_id, and a new PUT reorder endpoint atomically persists new orderings using PostgreSQL transactions. The GET endpoint now returns items ordered by sort_order ASC so the UI always sees the user's last-saved ordering.

## Deliverables

- `apps/api/src/db/schema.sql`: Added `sort_order INTEGER DEFAULT 0` column to wishlists table, added composite index `idx_wishlists_sort_order(event_id, participant_id, sort_order)`
- `apps/api/src/routes/wishlists.ts`:
  - GET `/:eventId/wishlists`: Changed ORDER BY from `created_at DESC` to `sort_order ASC NULLS LAST, created_at ASC`; added `sort_order` to SELECT and `sortOrder` to response mapping
  - POST `/:eventId/wishlists`: Calculates next sort_order via `COALESCE(MAX(sort_order), 0) + 1` before INSERT; includes `sortOrder` in response
  - PUT `/:eventId/wishlists/reorder`: New endpoint placed before `/:id` routes; validates all IDs belong to participant; uses transaction to bulk-update sort_order
  - PUT `/:eventId/wishlists/:id`: Added `sortOrder` to update response
- Database migration applied locally: ALTER TABLE, UPDATE backfill, CREATE INDEX

## Decisions Made

- Composite index on `(event_id, participant_id, sort_order)` — covers the primary query pattern of fetching a participant's items in order within an event
- `NULLS LAST` in ORDER BY — protects against any rows where sort_order is NULL during transition period
- Transaction for bulk reorder — ensures partial updates never leave ordering in inconsistent state
- Reorder route placed before `/:id` route — prevents Express from matching literal "reorder" string as an `:id` parameter
- Static import of `getClient` — consistent with established codebase pattern, avoids dynamic import overhead

## Issues Encountered

None — plan executed exactly as written. TypeScript compiled without errors (`npx tsc --noEmit` exit 0).

## Deviations from Plan

None - plan executed exactly as written.
