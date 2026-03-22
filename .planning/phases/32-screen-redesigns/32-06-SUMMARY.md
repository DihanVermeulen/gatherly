---
phase: 32
plan: 06
subsystem: mobile-ui
tags: [useFocusEffect, LinearGradient, module-sync, event-cards]

dependency-graph:
  requires: [32-05]
  provides: [module-state-sync-on-focus, consistent-event-card-gradient]
  affects: [33-potluck-screens]

tech-stack:
  added: []
  patterns: [useFocusEffect-for-back-navigation-refresh, LinearGradient-event-card-hero]

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/edit-event.tsx
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/app/(tabs)/index.tsx

decisions:
  - useFocusEffect replaces useEffect for module loading — fires on every screen focus including back-navigation
  - LinearGradient (#14b8a6 → #0f766e → #134e4a) replaces rotating HERO_COLORS array — consistent with Event Hub hero
  - HERO_COLORS array and index prop removed from EventCard entirely — no longer needed

metrics:
  duration: ~2m
  completed: 2026-03-22
---

# Phase 32 Plan 06: Module Focus Refresh + LinearGradient Event Cards Summary

**One-liner:** useFocusEffect replaces module-loading useEffect in edit-event and event-details; LinearGradient teal hero replaces rotating solid HERO_COLORS on event list cards.

## What Was Built

### Task 1: useFocusEffect Module Reload

Both `edit-event.tsx` and `event-details.tsx` previously loaded modules in a `useEffect` keyed on `[event?.id]` / `[id]`. This only fires on mount, not when navigating back from modules-config.

Changes made:

- **edit-event.tsx**: Added `useCallback` to React import and `useFocusEffect` to expo-router import. Added a `useFocusEffect(useCallback(() => { if (id) loadModules(); }, [id]))` block after the existing initialisation useEffect. The existing useEffect (which handles giftCount, coupleCrossing, invites, and first-load) is preserved untouched.
- **event-details.tsx**: Added `useCallback` to React import and `useFocusEffect` to expo-router import. Replaced the plain `useEffect(() => { modulesApi.getModules(id).then(setActiveModules).catch(() => {}); }, [id])` with an equivalent `useFocusEffect(useCallback(..., [id]))`.

Now, navigating back from the Module Config screen immediately triggers a fresh `getModules` call in both screens, reflecting any toggle changes.

### Task 2: LinearGradient Event Card Hero

The `(tabs)/index.tsx` EventCard component previously cycled through a `HERO_COLORS` array of Tailwind class strings (`bg-teal-500`, `bg-indigo-500`, etc.) to colour event heroes based on their list index.

Changes made:

- Added `import { LinearGradient } from "expo-linear-gradient"` (library already installed).
- Removed the `HERO_COLORS` constant array entirely.
- Removed the `index` prop from `EventCardProps` type and `EventCard` function signature.
- Updated the `renderItem` call in FlatList to destructure `{ item }` only (removed `index`).
- Replaced the hero `<View className={`h-32 ${heroColor}...`}>` with `<LinearGradient colors={["#14b8a6", "#0f766e", "#134e4a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 128, alignItems: "center", justifyContent: "center" }}>`.
- Children (initial letter Text + status badge View) unchanged.

Event list cards now show the same teal-to-dark gradient as the Event Hub hero, providing consistent visual branding.

## Commits

| Hash    | Message |
|---------|---------|
| 2d91a14 | fix(32-06): useFocusEffect for module reload, LinearGradient event cards |

## Verification

- `grep "useFocusEffect" apps/gatherly-mobile/app/edit-event.tsx` — 2 matches (import + usage)
- `grep "useFocusEffect" apps/gatherly-mobile/app/event-details.tsx` — 2 matches (import + usage)
- `grep "HERO_COLORS" apps/gatherly-mobile/app/(tabs)/index.tsx` — 0 matches
- `grep "LinearGradient" apps/gatherly-mobile/app/(tabs)/index.tsx` — 3 matches (import + open + close tag)
- `pnpm check-types` — ok (no errors)

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 33 (Potluck Screens) can proceed. No blockers introduced by this plan.
