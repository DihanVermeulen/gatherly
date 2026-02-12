---
phase: 08-sync-events
plan: 02
subsystem: state-management
tags: [tanstack-query, react-query, offline-first, optimistic-updates, react-context]

# Dependency graph
requires:
  - phase: 08-01
    provides: TanStack Query infrastructure with offline persistence
provides:
  - TanStack Query hooks for event CRUD with optimistic updates
  - Backward-compatible EventsContext adapter
  - Sync status monitoring hook
affects: [event-pages, wishlist-pages, offline-sync, background-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic UI updates with rollback on error
    - Query cache as single source of truth
    - Adapter pattern for backward compatibility
    - Cache-only updates for sub-resources (wishlists)

key-files:
  created:
    - apps/gatherly/src/hooks/useEventQueries.ts
    - apps/gatherly/src/hooks/useEventMutations.ts
    - apps/gatherly/src/hooks/useSyncStatus.ts
  modified:
    - apps/gatherly/src/contexts/EventsContext.tsx

key-decisions:
  - "useApi always true - TanStack Query handles offline-first transparently"
  - "Wishlist actions update query cache directly - preserve existing API pattern"
  - "Temp event IDs use 'temp-' prefix + timestamp for optimistic creates"
  - "All mutations use networkMode: offlineFirst with retry backoff"

patterns-established:
  - "Optimistic mutation pattern: onMutate (snapshot + optimistic update), onError (rollback), onSuccess (replace temp with real), onSettled (invalidate)"
  - "Adapter context pattern: preserve public API while delegating to different internal implementation"
  - "Cache-only updates for sub-resources that have their own API calls"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 08 Plan 02: Offline-First Event CRUD Summary

**TanStack Query hooks with optimistic updates replace useReducer while preserving EventsContext public API for zero page component changes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T23:01:01Z
- **Completed:** 2026-02-12T23:04:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Event CRUD operations use TanStack Query with optimistic UI updates
- Failed mutations automatically roll back to previous state
- Sync status monitoring via network state + mutation cache
- All existing page components work unchanged (backward compatible adapter)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hooks for event fetching, mutations, and sync status** - `fa482bc` (feat)
2. **Task 2: Refactor EventsContext to delegate to TanStack Query while preserving public API** - `4c326d1` (refactor)

## Files Created/Modified
- `apps/gatherly/src/hooks/useEventQueries.ts` - useEventsQuery and useEventByIdQuery with offline-first caching
- `apps/gatherly/src/hooks/useEventMutations.ts` - useCreateEvent, useUpdateEvent, useDeleteEvent with optimistic updates and rollback
- `apps/gatherly/src/hooks/useSyncStatus.ts` - useSyncStatus hook monitoring network + mutation cache state
- `apps/gatherly/src/contexts/EventsContext.tsx` - Refactored to delegate to TanStack Query internally while exposing same { state, dispatch, refreshEvents, useApi } API

## Decisions Made

**1. Set useApi to always true**
- TanStack Query handles offline-first mode transparently via `networkMode: 'offlineFirst'`
- The old concept of "check API availability, fallback to localStorage" is replaced by "always attempt API, cache handles offline"
- Pages still check `useApi` flag, but it's now always true since caching is automatic

**2. Wishlist actions update cache directly via setQueryData**
- Wishlist operations (ADD_WISHLIST_ITEM, UPDATE_WISHLIST_ITEM, etc.) already have separate API calls in page components
- Context dispatch only needs to update the cache for immediate UI feedback
- Pattern: `queryClient.setQueryData<Event[]>(['events'], (old = []) => ...mapper)`
- Preserves existing page component behavior without needing new mutation hooks

**3. Temp event IDs use 'temp-' prefix**
- Optimistic create assigns `id: 'temp-' + Date.now()` to new event
- On success, `onSuccess` replaces temp event with server response (has real integer ID)
- Pattern enables detecting optimistic vs confirmed events if needed

**4. All mutations configured with offline-first and retry**
- `networkMode: 'offlineFirst'` - mutations run immediately even when offline
- Retry with exponential backoff (3 attempts, max 30s delay) configured in queryClient
- Mutations queue when offline, sync when online

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Event CRUD is now powered by TanStack Query with optimistic updates. Ready for:
- Background sync implementation (08-03)
- Conflict resolution strategies (08-04+)
- Extend pattern to participants, couples, assignments, gifts

**Backward compatibility confirmed:** All existing page components (events/index.tsx, events/edit.tsx, events/wishlist.tsx) continue to work without modification via the preserved EventsContext API.

---
*Phase: 08-sync-events*
*Completed: 2026-02-12*
