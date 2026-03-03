---
phase: 19-offline-storage-strategy-sqlite-migration
plan: "04"
subsystem: mobile-navigation
tags: [expo-router, react-native, context, auth, layout]
completed: 2026-03-03T07:59:32Z

dependency-graph:
  requires:
    - 19-01 (SQLite foundation — DatabaseProvider, initDatabase, clearCache)
    - 19-02 (EventsContext migration to SQLite — useDatabase, cacheEvents)
    - 19-03 (NetInfo, OfflineBanner, networkMode mutations)
  provides:
    - EventsProvider scoped to authenticated session — mounts fresh on login, unmounts on sign-out
  affects: []

tech-stack:
  added: []
  patterns:
    - "Provider-inside-guard: scope React context providers inside Stack.Protected to achieve automatic mount/unmount with session lifecycle"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/_layout.tsx

decisions:
  - "EventsProvider scoped inside Stack.Protected guard={!!session} — mounts fresh on each login, unmounts on sign-out, resetting in-memory state"

metrics:
  duration: ~3m
  completed: 2026-03-03
---

# Phase 19 Plan 04: Sign-Out State Reset Summary

EventsProvider scoped inside authenticated guard so in-memory event state resets automatically on sign-out.

## Accomplishments

- Moved EventsProvider from wrapping entire RootLayoutNav to inside `Stack.Protected guard={!!session}` block
- EventsProvider now mounts fresh on each login (starting with initialState: events: [], loading: false, error: null) and unmounts on sign-out
- In-memory event state is automatically cleared on sign-out — no cross-account data leakage
- OfflineBanner remains outside EventsProvider, unaffected (uses only useNetworkStatus)
- join route remains outside EventsProvider (public route, unchanged)
- No changes to EventsContext.tsx or AuthContext.tsx

## Files Modified

- `apps/gatherly-mobile/app/_layout.tsx` — EventsProvider moved inside authenticated Stack.Protected guard

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Scope EventsProvider inside authenticated guard | 9a9c158 |

## Verification

- TypeScript: no new errors (pnpm check-types passed cleanly)
- Structure verified: EventsProvider is child of Stack.Protected guard={!!session} (lines 95-126)
- OfflineBanner confirmed outside EventsProvider (line 89, before guard opens at line 95)
- join screen confirmed outside EventsProvider (line 141, after guard closes at line 126)

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 19 gap closure complete. All 4 plans in phase 19 are done (19-01, 19-02, 19-03, 19-04). UAT Test 6 (sign-out clears cached data) should now pass with this fix in place.
