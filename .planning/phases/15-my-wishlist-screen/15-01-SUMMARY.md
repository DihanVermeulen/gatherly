---
plan: 15-01
phase: 15-my-wishlist-screen
subsystem: mobile-wishlist
status: complete
completed: 2026-02-26
tags: [expo-router, gorhom/bottom-sheet, gluestack, expo-image-picker, optimistic-ui, flatlist]
requires: [14-01, 14-02]
provides: [my-wishlist screen, AddWishlistItem component, wishlist routes in _layout.tsx]
affects: [16-event-wishlists-screen]
tech-stack:
  added: [expo-image-picker@^55.0.9]
  patterns: [optimistic-delete-with-revert, bottom-sheet-add-form, participantDetails-via-getById]
key-files:
  created:
    - apps/gatherly-mobile/app/my-wishlist.tsx
    - apps/gatherly-mobile/components/AddWishlistItem.tsx
  modified:
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/package.json
decisions:
  - name: npm-with-ignore-scripts
    choice: "npm install --ignore-scripts"
    reason: "pnpm not usable in gatherly-mobile (virtual store length mismatch); npm install was triggering @gluestack-ui/core rebuild via postinstall; --ignore-scripts bypasses the broken postinstall while still installing expo-image-picker"
  - name: requestMediaLibraryPermissionsAsync
    choice: "Call explicitly before launchImageLibraryAsync"
    reason: "Research noted Android requires explicit permission; calling it on iOS is harmless — consistent cross-platform approach"
  - name: BottomSheetTextInput-in-AddWishlistItem
    choice: "Use BottomSheetTextInput from @gorhom/bottom-sheet"
    reason: "Prevents keyboard overlap inside gorhom bottom sheet (known pitfall documented in research)"
  - name: participantDetails-local-state
    choice: "Fetch via eventsApi.getById in my-wishlist.tsx useEffect"
    reason: "getAll() does not include participantDetails; local state avoids polluting EventsContext shape"
metrics:
  duration: "6 minutes"
  tasks_completed: 2
---

# Phase 15 Plan 01 Summary: My Wishlist Screen

## What Was Built

The My Wishlist screen lets authenticated users view, add, and delete their personal wishlist items for a specific event. A gorhom bottom sheet with a form component (AddWishlistItem) handles item creation with four fields: name, description, optional image (via expo-image-picker), and priority (segmented control). Long-press on a card opens a GlueStack ActionSheet with Edit and Delete options; delete is optimistic and reverts via SET_WISHLISTS if the API call fails. The "Add My Gifts" button on event-details now navigates to this screen.

## Deliverables

- `apps/gatherly-mobile/app/my-wishlist.tsx`: Wishlist list screen — 441 lines — FlatList of WishlistCards, FAB, ActionSheet, AlertDialog delete confirmation, gorhom bottom sheet, loading and empty states
- `apps/gatherly-mobile/components/AddWishlistItem.tsx`: Bottom sheet form — 227 lines — name, description, image picker, priority segmented control, BottomSheetTextInput for keyboard handling
- `apps/gatherly-mobile/app/_layout.tsx`: Added `my-wishlist` and `edit-wishlist-item` Stack.Screen registrations
- `apps/gatherly-mobile/app/event-details.tsx`: Wired "Add My Gifts" button to `router.push(/my-wishlist?id=${event.id})`
- `apps/gatherly-mobile/package.json`: Added expo-image-picker dependency

## Commits

| Task | Hash | Files |
|------|------|-------|
| Install expo-image-picker, register routes, wire Add My Gifts button | 1b1e79a | _layout.tsx, event-details.tsx, package.json |
| Create AddWishlistItem component and my-wishlist screen | 082a69c | my-wishlist.tsx, AddWishlistItem.tsx |

## Deviations

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm install --ignore-scripts required**

- **Found during:** Task 1
- **Issue:** `npm install expo-image-picker` triggered `@gluestack-ui/core@3.0.12` postinstall script, which tried to run `generate-barrel-exports.js` from pnpm's virtual store path — file not found. This caused the install to fail entirely.
- **Fix:** Used `npm install expo-image-picker --legacy-peer-deps --ignore-scripts` to bypass the postinstall hook. expo-image-picker was installed correctly; the gluestack-ui/core package was already built and functional.
- **Files modified:** apps/gatherly-mobile/package.json
- **Commit:** 1b1e79a

## Issues

None — all success criteria met.
