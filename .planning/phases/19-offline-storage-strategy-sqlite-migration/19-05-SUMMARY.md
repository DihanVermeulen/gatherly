---
phase: 19-offline-storage-strategy-sqlite-migration
plan: "05"
completed: 2026-03-03T09:55:59Z
---

# Phase 19 Plan 05: Key-Based EventsProvider Remount Summary

**One-liner:** Reverted broken 19-04 approach by placing EventsProvider outside Stack.Protected with key={session} for clean remount on session change.

## Accomplishments

- Reverted 19-04 change: EventsProvider moved back to outside Stack.Protected (wrapping GestureHandlerRootView)
- Added key={session ?? 'unauthenticated'} to EventsProvider — React destroys and remounts it when session changes (sign-out → 'unauthenticated' key, sign-in → token key)
- Stack.Protected now contains only Stack.Screen components — Expo Router navigation tree is correct
- Sign-out redirects to Login screen correctly
- No spurious invite expired error on login
- Events state resets on each session change (fresh useReducer initialState)

## Root Cause of 19-04 Regression

Stack.Protected in Expo Router expects only Stack.Screen children. Placing EventsProvider inside it broke screen registration and guard-based redirect, causing: (1) no redirect after logout, (2) broken navigation state triggering consumePendingInviteCode spuriously.

## Files Modified

- `apps/gatherly-mobile/app/_layout.tsx` — EventsProvider back outside Stack.Protected with key prop

## Decisions Made

| Decision | Rationale |
|---|---|
| EventsProvider key={session ?? 'unauthenticated'} outside Stack.Protected | Achieves state reset on session change without breaking Expo Router's Stack.Protected screen registration contract |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript: no new errors (pnpm check-types clean)
- grep confirms EventsProvider with key= is outside Stack.Protected (line 82 vs line 96)
- Stack.Protected contains only Stack.Screen components
- EventsProvider closes after both Stack.Protected blocks (line 147)

## Next Phase Readiness

Phase 19 gap closure complete. All v2.1 phases complete. No blockers.
