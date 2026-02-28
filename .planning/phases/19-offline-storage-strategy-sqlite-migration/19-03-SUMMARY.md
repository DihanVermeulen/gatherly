---
phase: 19-offline-storage-strategy-sqlite-migration
plan: 03
subsystem: ui
tags: [netinfo, react-native, offline, react-query, nativewind]

# Dependency graph
requires:
  - phase: 19-01
    provides: DatabaseProvider and SQLite cache layer (useDatabase, cacheEvents)
  - phase: 19-02
    provides: EventsContext SQLite migration (loads cached events on cold start)
provides:
  - useNetworkStatus hook: NetInfo-based connectivity state (boolean | null)
  - useSyncStatus rewrite: web-API-free, uses NetInfo on iOS/Android
  - OfflineBanner component: amber banner shown when definitively offline
  - Offline banner wired into _layout.tsx SafeAreaView via Fragment pattern
  - networkMode: 'online' on all 6 useMutation calls (event + wishlist)
affects: [any future UI work using network state, any additional mutation hooks]

# Tech tracking
tech-stack:
  added: ["@react-native-community/netinfo@11.4.1"]
  patterns:
    - "NetInfo subscription pattern: addEventListener returns unsubscribe, used directly as useEffect cleanup"
    - "isConnected !== false pattern: treat null (initializing) as online, only false = definitively offline"
    - "Fragment wrapper pattern: SafeAreaView with single-child constraint wrapped in <> to accommodate OfflineBanner + ThemeProvider as siblings"
    - "networkMode: 'online' on useMutation: pauses mutation without firing, auto-resumes on reconnect"

key-files:
  created:
    - apps/gatherly-mobile/hooks/useNetworkStatus.ts
    - apps/gatherly-mobile/components/OfflineBanner.tsx
  modified:
    - apps/gatherly-mobile/hooks/useSyncStatus.ts
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/hooks/useEventMutations.ts
    - apps/gatherly-mobile/hooks/useWishlistMutations.ts
    - apps/gatherly-mobile/package.json

key-decisions:
  - "isConnected !== false: null (initializing) treated as online to avoid false-positive offline banner on app launch"
  - "npx expo install worked for netinfo (pnpm didn't fail this time, unlike expo-sqlite)"
  - "Fragment wrapper for SafeAreaView children: avoids extra View in layout tree while allowing two siblings"

patterns-established:
  - "NetInfo subscription: NetInfo.addEventListener returns unsubscribe function, use directly as useEffect return"
  - "networkMode: 'online' per-mutation: no central QueryClient config needed, added inline to each useMutation options"

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 19 Plan 03: Offline UI Indicators and Read-Only Enforcement Summary

**Native NetInfo network detection via @react-native-community/netinfo, OfflineBanner component wired into SafeAreaView layout, and networkMode: 'online' on all 6 mutation hooks to enforce read-only offline strategy**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T11:55:04Z
- **Completed:** 2026-02-28T11:59:07Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Replaced web-only `window.addEventListener('online'/'offline')` in useSyncStatus with `useNetworkStatus` (NetInfo-based), making sync status work on iOS and Android
- Created `OfflineBanner` that shows "You're offline — showing cached data" in amber when `isConnected === false`, auto-hides when connectivity returns
- Enforced read-only offline strategy: all 6 `useMutation` calls now have `networkMode: 'online'` so React Query pauses mutations (does not fire them) when offline

## Task Commits

Each task was committed atomically:

1. **Task 1: Install NetInfo and create useNetworkStatus hook** - `59bcbeb` (feat)
2. **Task 2: Fix useSyncStatus + create OfflineBanner + wire into layout** - `6364d61` (feat)
3. **Task 3: Enforce read-only offline by setting networkMode on mutations** - `119f5b0` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `apps/gatherly-mobile/hooks/useNetworkStatus.ts` - New hook: NetInfo.addEventListener subscription, returns boolean | null
- `apps/gatherly-mobile/hooks/useSyncStatus.ts` - Rewritten: removed window/navigator web APIs, uses useNetworkStatus instead
- `apps/gatherly-mobile/components/OfflineBanner.tsx` - New component: amber banner, only visible when isConnected === false
- `apps/gatherly-mobile/app/_layout.tsx` - Added OfflineBanner import and render inside SafeAreaView Fragment
- `apps/gatherly-mobile/hooks/useEventMutations.ts` - Added networkMode: 'online' to create/update/delete mutations
- `apps/gatherly-mobile/hooks/useWishlistMutations.ts` - Added networkMode: 'online' to claim/unclaim/reorder mutations
- `apps/gatherly-mobile/package.json` - Added @react-native-community/netinfo@11.4.1

## Decisions Made

- **isConnected !== false pattern:** `null` (NetInfo initializing) is treated as online to avoid false-positive offline banner on app launch. Only `false` triggers the offline banner.
- **Fragment wrapper for SafeAreaView:** SafeAreaView expects a single child. Used `<>...</>` Fragment wrapping `<OfflineBanner />` + `<ThemeProvider>` to add the banner without introducing an extra `<View>` in the layout tree.
- **Per-mutation networkMode:** No central QueryClient config exists in the codebase, so `networkMode: 'online'` added inline to each `useMutation` options object rather than via default options.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `hooks/useEventMutations.ts` and `hooks/useWishlistMutations.ts` (`Cannot find module '../api/events'`) — these errors existed before any changes in this plan (confirmed via git stash test). The `api/` directory does not exist yet in gatherly-mobile (likely a future phase). Our changes did not introduce any new errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 19 is complete. All three plans executed:
- 19-01: SQLite foundation (database.ts, cache.ts, DatabaseProvider)
- 19-02: EventsContext SQLite migration, AsyncStorage removed
- 19-03: Offline UI indicators (NetInfo, OfflineBanner, networkMode mutations)

The offline storage strategy is now fully implemented. The app:
- Caches events in SQLite on successful API fetch
- Shows cached data on cold start when offline
- Displays amber banner when offline
- Blocks all mutations when offline (read-only strategy enforced)

---
*Phase: 19-offline-storage-strategy-sqlite-migration*
*Completed: 2026-02-28*
