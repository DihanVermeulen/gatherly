---
phase: 08-sync-events
plan: 01
subsystem: data-layer
tags: [tanstack-query, offline-first, localstorage, persistence, migration]

# Dependency graph
requires:
  - phase: 07-jwt-authentication
    provides: API client with auth interceptors
provides:
  - TanStack Query v5 configured as offline-first data layer
  - Query cache persistence to localStorage
  - Migration utility for backward compatibility with v1 storage
  - Mutation defaults for event CRUD operations
affects: [08-02, 08-03, 08-04, 08-05]

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-query v5.90.20"
    - "@tanstack/react-query-persist-client v5.90.22"
    - "@tanstack/query-sync-storage-persister v5.90.22"
  patterns:
    - "Offline-first query configuration with localStorage persistence"
    - "Mutation defaults pattern for consistent API sync"
    - "Data migration pattern for localStorage version upgrades"

key-files:
  created:
    - "apps/gatherly/src/lib/queryClient.ts"
    - "apps/gatherly/src/lib/queryPersister.ts"
    - "apps/gatherly/src/lib/migrateStorage.ts"
  modified:
    - "apps/gatherly/src/App.tsx"
    - "apps/gatherly/src/index.tsx"
    - "apps/gatherly/package.json"

key-decisions:
  - "TanStack Query v5 as sole query library (removed react-query v3)"
  - "24h garbage collection time for persistent cache"
  - "5min stale time for query freshness"
  - "offlineFirst network mode for queries and mutations"
  - "Exponential backoff retry (3 attempts, up to 30s delay)"
  - "localStorage key 'gatherly-query-cache' for new cache"
  - "Migration preserves old 'secret_santa_events' key for safety"
  - "Migration creates backup at 'gatherly-events-v1-backup'"
  - "Migration runs synchronously before React renders"

patterns-established:
  - "Query client created at module scope (not inside component)"
  - "Mutation defaults define server-sync functions for offline mutations"
  - "PersistQueryClientProvider onSuccess callback resumes paused mutations"
  - "Migration utility never throws - logs errors and allows app to boot"

# Metrics
duration: 4.12min
completed: 2026-02-12
---

# Phase 08 Plan 01: TanStack Query Infrastructure Summary

**TanStack Query v5 offline-first data layer with localStorage persistence, mutation resumption on hydration, and backward-compatible migration from v1 storage**

## Performance

- **Duration:** 4.12 min
- **Started:** 2026-02-12T18:20:04Z
- **Completed:** 2026-02-12T18:24:11Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Installed TanStack Query persist plugins and removed legacy react-query v3
- Created query client with offline-first defaults (24h gc, 5min stale, retry with backoff)
- Configured localStorage persister with automatic mutation resumption
- Built migration utility to preserve existing user data from v1 format
- Fixed QueryClient instantiation bug (was creating new instance on every render)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TanStack Query v5 persist plugins and create query infrastructure** - `f565a9a` (chore)
2. **Task 2: Wire PersistQueryClientProvider into App.tsx and call migration in index.tsx** - `cadb2a0` (feat)

## Files Created/Modified

- `apps/gatherly/src/lib/queryClient.ts` - Query client with offline-first configuration and event mutation defaults
- `apps/gatherly/src/lib/queryPersister.ts` - localStorage persister for query cache using 'gatherly-query-cache' key
- `apps/gatherly/src/lib/migrateStorage.ts` - Migration utility converting v1 'secret_santa_events' to v2 format
- `apps/gatherly/src/App.tsx` - Replaced QueryClientProvider with PersistQueryClientProvider, removed per-render client creation bug
- `apps/gatherly/src/index.tsx` - Calls migrateFromV1() before React renders
- `apps/gatherly/src/test/index.tsx` - Updated to @tanstack/react-query v5
- `apps/gatherly/src/components/examples/react-query/index.tsx` - Updated to v5 object syntax (queryKey, queryFn)
- `apps/gatherly/package.json` - Removed react-query v3, added persist plugins

## Decisions Made

**1. Removed old react-query v3 entirely**
- Rationale: Mixing v3 and v5 causes import conflicts and bundle size bloat. V5 is superior in all ways.

**2. QueryClient created at module scope instead of inside App component**
- Rationale: Creating new QueryClient on every render resets all cache state and breaks persistence. Module-scope ensures singleton.

**3. 24-hour garbage collection time for query cache**
- Rationale: Balances localStorage size constraints with long-term offline access. Events are infrequently created, so 24h is reasonable.

**4. 5-minute stale time for queries**
- Rationale: Reduces unnecessary refetches while ensuring data freshness for multi-user events.

**5. Migration preserves old localStorage key for safety**
- Rationale: During transition period, users can revert if issues arise. Can be deleted in future cleanup phase.

**6. Migration creates backup at 'gatherly-events-v1-backup'**
- Rationale: Extra safety net for user data. Never delete user data without explicit backup.

**7. Migration runs before React renders (synchronous)**
- Rationale: Ensures migrated data is available when PersistQueryClientProvider hydrates cache. No race conditions.

**8. onSuccess callback resumes paused mutations**
- Rationale: Offline mutations pause when network unavailable. Resumption after hydration syncs them to server automatically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed QueryClient instantiation inside App component**
- **Found during:** Task 2 (Updating App.tsx)
- **Issue:** `const queryClient = new QueryClient()` inside App function creates new client on every render, destroying cache and persistence
- **Fix:** Removed local instantiation, imported singleton from lib/queryClient.ts
- **Files modified:** apps/gatherly/src/App.tsx
- **Verification:** Build succeeds, cache persists across re-renders
- **Committed in:** cadb2a0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Critical bug fix for cache persistence. Original plan didn't specify removal, but leaving it would break offline-first functionality completely.

## Issues Encountered

None - plan executed smoothly. All dependencies installed successfully, TypeScript compilation clean, build succeeded.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plan:**
- Query infrastructure established and tested
- Old data migration verified
- Persistence layer functional
- Ready to build offline-first event hooks (08-02)

**No blockers or concerns.**

---
*Phase: 08-sync-events*
*Completed: 2026-02-12*
