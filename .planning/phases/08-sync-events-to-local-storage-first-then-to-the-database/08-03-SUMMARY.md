---
phase: 08-sync-events
plan: 03
subsystem: ui
tags: [sync-indicator, offline-first, tanstack-query, react, tailwind]

requires:
  - phase: 08-02
    provides: useSyncStatus hook and TanStack Query mutation hooks

provides:
  - SyncIndicator component with four visual states (synced/syncing/offline/error)
  - MainLayout integration making sync status visible on all pages
  - Correct offline-first event create/delete routing through TanStack Query
  - Wishlist cache preservation across background refetches
  - Correct participantId-based wishlist navigation

affects: [all-pages, event-crud, wishlist-pages]

tech-stack:
  added: []
  patterns:
    - Fixed-position floating pill for non-intrusive status feedback
    - useRef for prevStatus tracking (avoids stale closure in useEffect)
    - useEventByIdQuery in edit page to get participantDetails for navigation

key-files:
  created:
    - apps/gatherly/src/components/SyncIndicator.tsx
  modified:
    - apps/gatherly/src/layouts/MainLayout.tsx
    - apps/gatherly/src/pages/events/index.tsx
    - apps/gatherly/src/hooks/useEventQueries.ts
    - apps/gatherly/src/pages/events/edit.tsx

key-decisions:
  - "SyncIndicator uses useRef for prevStatus — avoids stale closure on syncing→synced transition"
  - "Fixed bottom-20 positioning — above potential bottom nav, centered with -translate-x-1/2"
  - "Synced state auto-hides after 3s — non-intrusive, only shows after completing a sync"
  - "events/index.tsx uses dispatch for all creates/deletes — enables TanStack Query offline queue"
  - "useEventByIdQuery in edit page — gets participantDetails.id for correct wishlist URL"

patterns-established:
  - "Route all event mutations through dispatch() — never call eventsApi directly from pages"
  - "Preserve sub-resource cache (wishlists) when merging refetched parent data"

duration: 12min
completed: 2026-02-13
---

# Phase 08 Plan 03: SyncIndicator + Offline-First Verification Summary

**Floating sync status badge wired into MainLayout, plus four bug fixes completing the offline-first architecture**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-13
- **Completed:** 2026-02-13
- **Tasks:** 1 planned + 4 bug fixes
- **Files modified:** 5

## Accomplishments
- SyncIndicator renders four states (synced/syncing/offline/error) as a floating pill visible on every page
- Event create/delete now routes through TanStack Query mutations, enabling offline queuing and the sync indicator
- Wishlist cache survives background refetches from mutation onSettled invalidations
- Wishlist navigation uses participant database IDs instead of names

## Task Commits

1. **Task 1: Create SyncIndicator + wire into MainLayout** — `44381cb` (feat)
2. **Fix 1: Route event create/delete through dispatch** — `37c8811` (fix)
3. **Fix 2: Preserve wishlist cache on refetch** — `50546ef` (fix)
4. **Fix 3: SyncIndicator prevStatus stale closure** — `3e55161` (fix)
5. **Fix 4: participantDetails.id for wishlist navigation** — `deae8e8` (fix)

## Files Created/Modified
- `apps/gatherly/src/components/SyncIndicator.tsx` — Four-state floating pill badge
- `apps/gatherly/src/layouts/MainLayout.tsx` — SyncIndicator rendered in layout
- `apps/gatherly/src/pages/events/index.tsx` — createEvent/deleteEvent now use dispatch instead of direct API calls
- `apps/gatherly/src/hooks/useEventQueries.ts` — queryFn merges incoming events with cached wishlists
- `apps/gatherly/src/pages/events/edit.tsx` — Wishlist section uses fullEvent.participantDetails for navigation

## Decisions Made

**1. useRef for prevStatus in SyncIndicator**
- useState + useEffect dependency caused stale closure when status rapidly changed syncing→synced
- useRef updates synchronously, never in dependency arrays, eliminates the race

**2. dispatch() always for event CRUD in index.tsx**
- events/index.tsx had `if (useApi)` branch calling eventsApi directly — bypassed TanStack Query entirely
- useIsMutating() was always 0, so SyncIndicator never fired
- Offline creates failed immediately (no optimistic update)
- Fix: always use dispatch() so EventsContext routes through the mutation hooks

**3. Cache wishlist preservation in useEventQueries.ts**
- mutation onSettled calls invalidateQueries → triggers background refetch from list endpoint
- List endpoint does not include wishlists (loaded separately per event)
- Fix: queryFn reads existing cache and merges wishlists into refetched events

**4. participantDetails.id for wishlist navigation**
- edit.tsx used editingEvent.people (name strings) for URL: /wishlist/Alice
- parseInt("Alice") = NaN → JSON null → server: "participantId is required"
- Fix: useEventByIdQuery(id) in edit page provides participantDetails with numeric IDs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug Fix] Event create/delete bypassed TanStack Query**
- **Found during:** Human verification (sync indicator not showing, offline creates failing)
- **Issue:** events/index.tsx called eventsApi directly when useApi=true, so mutations were never tracked
- **Fix:** Removed if/else branching, always dispatch() to route through mutation hooks
- **Committed in:** 37c8811

**2. [Rule 1 - Bug Fix] Wishlist cache wiped on background refetch**
- **Found during:** Human verification (wishlist items not saving)
- **Issue:** invalidateQueries triggered refetch that returned events without wishlists
- **Fix:** queryFn merges incoming events with cached wishlists
- **Committed in:** 50546ef

**3. [Rule 1 - Bug Fix] SyncIndicator prevStatus race condition**
- **Found during:** Code review of SyncIndicator logic
- **Issue:** useState + useEffect dependency array caused stale closure on state transitions
- **Fix:** useRef for prevStatus
- **Committed in:** 3e55161

**4. [Rule 1 - Bug Fix] Wishlist navigation used participant names as IDs**
- **Found during:** Human verification (participantId is required error)
- **Issue:** edit.tsx navigated to /wishlist/Alice instead of /wishlist/5
- **Fix:** useEventByIdQuery to get participantDetails with numeric IDs
- **Committed in:** deae8e8

---

**Total deviations:** 4 auto-fixed
**Impact on plan:** All fixes required for correctness. Phase 8 offline-first architecture is now complete.

## Issues Encountered

Four bugs surfaced during human verification, all fixed automatically per deviation rules.

## User Setup Required

None.

## Next Phase Readiness

Phase 8 complete. All offline-first success criteria met:
- Events load from cache instantly before API responds
- Create/update/delete show immediately (optimistic updates)
- Offline mutations queue and sync on reconnect
- Failed mutations roll back and show retry option
- Visual sync indicator visible on all pages
- All existing pages work without modification

---
*Phase: 08-sync-events*
*Completed: 2026-02-13*
