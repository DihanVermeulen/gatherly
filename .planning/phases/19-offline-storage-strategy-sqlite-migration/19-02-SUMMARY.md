---
phase: 19-offline-storage-strategy-sqlite-migration
plan: 02
subsystem: database
tags: [sqlite, async-storage, react-native, offline, cache, context, auth]

# Dependency graph
requires:
  - phase: 19-01
    provides: SQLite database layer (initDatabase, cache helpers, DatabaseProvider)
provides:
  - EventsContext using SQLite (cacheEvents/loadCachedEvents) instead of AsyncStorage
  - signOut clears SQLite cache via clearCache() on user logout
  - AsyncStorage package completely removed from gatherly-mobile
affects:
  - 19-03 (offline UI — EventsContext now feeds from SQLite cache on cold start)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - initDatabase() direct call in AuthContext (outside DatabaseProvider) — returns singleton, safe to call from SignOut
    - Cache cleared after SecureStore cleanup but before React state reset — clean teardown order
    - try/catch wrap on cache clearing in signOut — sign-out never fails due to DB issues

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/contexts/EventsContext.tsx
    - apps/gatherly-mobile/app/contexts/AuthContext.tsx
    - apps/gatherly-mobile/package.json

key-decisions:
  - "initDatabase() direct call in signOut — SessionProvider is outside DatabaseProvider so useDatabase() would throw; singleton pattern makes direct call safe"
  - "clearCache called after SecureStore.deleteItemAsync but before state setters — ensures data is gone before UI reacts to null session"

patterns-established:
  - "Direct initDatabase() call for out-of-tree code needing DB: safe due to singleton — same instance as DatabaseProvider"
  - "try/catch around SQLite ops in signOut — sign-out path must never fail regardless of DB state"

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 19 Plan 02: EventsContext SQLite Migration Summary

**AsyncStorage completely replaced with SQLite in EventsContext, cache cleared on signOut, and @react-native-async-storage/async-storage package removed**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-28T11:51:01Z
- **Completed:** 2026-02-28T11:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Migrated EventsContext to use `useDatabase()` + `cacheEvents()`/`loadCachedEvents()` from Plan 01's cache layer
- Removed `AsyncStorage` import, `STORAGE_KEY` constant, and all AsyncStorage calls from EventsContext
- Added SQLite cache clearing to `signOut` in AuthContext via direct `initDatabase()` call (bypasses DatabaseProvider since SessionProvider is outside it)
- Removed `@react-native-async-storage/async-storage` package entirely from package.json

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate EventsContext from AsyncStorage to SQLite** - `4187a9b` (feat)
2. **Task 2: Add cache clearing on signOut + remove AsyncStorage package** - `3f9c13b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/gatherly-mobile/app/contexts/EventsContext.tsx` - Replaced AsyncStorage with useDatabase() + cacheEvents/loadCachedEvents; removed STORAGE_KEY constant
- `apps/gatherly-mobile/app/contexts/AuthContext.tsx` - Added clearCache() call in signOut after SecureStore cleanup; imports initDatabase and clearCache
- `apps/gatherly-mobile/package.json` - Removed @react-native-async-storage/async-storage dependency

## Decisions Made

- **initDatabase() direct call in signOut** — SessionProvider wraps the entire app tree including DatabaseProvider, meaning AuthContext's `signOut` executes in a component that is outside DatabaseProvider. Using `useDatabase()` would throw. Instead, `initDatabase()` is called directly — it returns the existing singleton instance (no re-initialization), so this is functionally equivalent to `useDatabase()` without the React context requirement.
- **clearCache after SecureStore, before state setters** — Tear-down order: invalidate server session (authApi.logout), wipe local token storage (SecureStore), wipe local data cache (SQLite), then reset React state. This ensures no stale data lingers if the state update triggers a re-render.

## Deviations from Plan

None — plan executed exactly as written. EventsContext was already partially migrated in the working tree (the diff confirmed the AsyncStorage removal and SQLite import additions were present but uncommitted), so Task 1 was committed directly from the working tree without re-editing.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 (offline UI) can now rely on EventsContext loading from SQLite cache on cold start — the data pipeline is complete
- No blockers for Plan 03 execution
- The only remaining AsyncStorage reference in the codebase is a comment in `app/utils/pendingInvite.ts` explaining why that module intentionally does NOT use AsyncStorage — not an import, not a concern

---
*Phase: 19-offline-storage-strategy-sqlite-migration*
*Completed: 2026-02-28*
