---
phase: quick-004
plan: 01
subsystem: mobile-ui
tags: [react-native, components, refactor, AppHeader, headers]

dependency-graph:
  requires: []
  provides:
    - AppHeader reusable component at components/AppHeader.tsx
    - All 10 screens use consistent header pattern
  affects:
    - Any future screen that needs a header

tech-stack:
  added: []
  patterns:
    - Centralized header component with title/subtitle/onBack/rightAction/rightElement props
    - Inline styles only in shared component (no NativeWind) for cross-screen consistency
    - SafeAreaView top edge added to all screens that were missing it

key-files:
  created:
    - apps/gatherly-mobile/components/AppHeader.tsx
  modified:
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/app/edit-event.tsx
    - apps/gatherly-mobile/app/edit-event-details.tsx
    - apps/gatherly-mobile/app/edit-wishlist-item.tsx
    - apps/gatherly-mobile/app/my-wishlist.tsx
    - apps/gatherly-mobile/app/view-wishlists.tsx
    - apps/gatherly-mobile/app/modules-config.tsx
    - apps/gatherly-mobile/app/polls.tsx
    - apps/gatherly-mobile/app/rsvp.tsx
    - apps/gatherly-mobile/app/manage-exclusions.tsx

decisions:
  - decision: "rightElement prop accepts React.ReactNode to allow fully custom right-side content (e.g. date badge)"
    rationale: "event-details.tsx's date badge is a coloured pill View — can't be expressed as a simple label or icon"
  - decision: "Spacer View auto-inserted on right when onBack is present and no rightAction/rightElement given"
    rationale: "Keeps title centred without caller needing to pass an explicit spacer"
  - decision: "manage-exclusions.tsx wrapped in SafeAreaView edges=['top'] instead of top+bottom"
    rationale: "Screen has its own absolute-positioned bottom save bar — adding bottom edge would double-pad"

metrics:
  duration: "~8 minutes"
  completed: "2026-03-24"
  tasks-completed: 2
  tasks-total: 2
---

# Quick Task 004: Modular Header Component Summary

**One-liner:** Extracted reusable `AppHeader` component (title/subtitle/back/rightAction/rightElement) and replaced 10 copy-pasted inline header blocks across all app screens.

## What Was Built

Created `apps/gatherly-mobile/components/AppHeader.tsx` as a centralised header component matching the canonical event-details.tsx header style exactly (white background, teal back arrow, 56px min-height, slate border bottom). Replaced every inline header block across all app screens in a single commit.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AppHeader component | 86b6865 | components/AppHeader.tsx |
| 2 | Replace all inline headers with AppHeader | 845e184 | 10 screen files |

## AppHeader API

```tsx
<AppHeader
  title="Screen Title"
  subtitle="Optional subtitle"            // renders below title in grey
  onBack={() => router.back()}            // shows ArrowLeft if provided
  rightAction={{
    label?: "Save",                        // pill button with text
    icon?: <Plus size={20} color="white"/>, // or icon-only circle
    onPress: () => {},
    disabled?: boolean,
    loading?: boolean,                     // shows ActivityIndicator
    style?: { backgroundColor?: string },
  }}
  rightElement={<CustomView />}            // fully custom right content (e.g. date badge)
/>
```

When neither `rightAction` nor `rightElement` is provided, a 40px spacer is auto-inserted to keep the title centred when a back button is present.

## Screen Mapping

| Screen | Title | Subtitle | Right Side |
|--------|-------|----------|------------|
| event-details.tsx | event.name | dateLocationLine | date badge (UPCOMING/TODAY/PAST) |
| edit-event.tsx | "Manage Event" | — | spacer |
| edit-event-details.tsx | "Edit Event" | — | spacer |
| edit-wishlist-item.tsx | "Edit Item" | — | Save pill button with loading state |
| my-wishlist.tsx | "My Wishlist" | event.name | spacer |
| view-wishlists.tsx | "Wishlists" | event.name | spacer |
| modules-config.tsx | "Customize Your Event" | — | spacer |
| polls.tsx | "Polls" | — | Plus icon (organizer only) |
| rsvp.tsx (organizer) | "RSVP Responses" | — | spacer |
| rsvp.tsx (participant) | "RSVP" | — | spacer |
| manage-exclusions.tsx | "Manage Exclusions" | — | spacer (onBack triggers save) |

## SafeAreaView Updates

All screens that were missing `"top"` in their SafeAreaView edges were updated:
- edit-event.tsx: `["bottom"]` → `["top", "bottom"]`
- edit-event-details.tsx: `["bottom"]` → `["top", "bottom"]`
- edit-wishlist-item.tsx: `["bottom"]` → `["top", "bottom"]`
- my-wishlist.tsx: `["bottom"]` → `["top", "bottom"]`
- view-wishlists.tsx: `["bottom"]` → `["top", "bottom"]`
- modules-config.tsx: `["bottom"]` → `["top", "bottom"]`
- polls.tsx: `["bottom"]` → `["top", "bottom"]`
- rsvp.tsx (both returns): `["bottom"]` → `["top", "bottom"]`
- manage-exclusions.tsx: bare `View` → `SafeAreaView edges={["top"]}` (bottom not added — has own absolute save bar)

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript: zero errors introduced (2 pre-existing errors in edit-event-details.tsx and ui/bottomsheet remain, unrelated to this task)
- All 10 screens import AppHeader: `grep -r "import.*AppHeader" app/ --include="*.tsx" | wc -l` → 10
- No old inline header comments: `grep -n "Header bar" app/*.tsx` → empty
- All ArrowLeft imports removed from screens that no longer use them directly
