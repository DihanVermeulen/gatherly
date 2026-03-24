---
phase: quick
plan: "003"
subsystem: mobile-ui
tags: [react-native, navigation, layout, event-details, header]
one-liner: "Dedicated white header bar above hero in event-details matching Details.png template"

dependency-graph:
  requires: []
  provides:
    - "event-details header matches Details.png design template"
  affects:
    - "Phase 33 (Potluck Screens) — event-details is the entry point for module navigation"

tech-stack:
  added: []
  patterns:
    - "SafeAreaView edges=[top,bottom] with header bar outside ScrollView for fixed positioning"
    - "Back arrow as plain teal icon (no circle background) in white header bar"

key-files:
  created: []
  modified:
    - apps/gatherly-mobile/app/event-details.tsx

decisions:
  - id: header-outside-scrollview
    choice: "Header bar rendered as a sibling to ScrollView, not inside it"
    rationale: "Fixed positioning — header stays pinned as user scrolls the module cards"
  - id: badge-in-header
    choice: "Date badge (UPCOMING/TODAY/PAST) moved to right side of header bar"
    rationale: "Matches Details.png layout; hero is now purely visual with no overlaid elements"
  - id: hero-height-reduction
    choice: "HERO_HEIGHT reduced from 260 to 190"
    rationale: "Hero no longer needs space for overlaid event name/date text block"
  - id: removed-bottom-scrim
    choice: "Removed LinearGradient bottom scrim from hero"
    rationale: "Scrim was only needed to make overlaid white text legible; text is now in the header"

metrics:
  duration: "~5m"
  completed: "2026-03-24"
  tasks-completed: 1
  tasks-total: 1
---

# Quick Task 003: Event Hub Header — Match Details.png Summary

**One-liner:** Dedicated white header bar above hero in event-details matching Details.png template

## What Was Done

Restructured `event-details.tsx` so the screen layout matches the approved `Details.png` design template:

**Before:** Back arrow floated over the hero banner (circular dark background), event name and date/location overlaid at the bottom of the hero image.

**After:** A dedicated white header bar sits above the hero with: teal back arrow (left), event name + date/location subtitle (center), UPCOMING/TODAY/PAST badge (right). Hero is purely visual below.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract header from hero, create dedicated header bar | 74326b0 | apps/gatherly-mobile/app/event-details.tsx |

## Changes Made

- `SafeAreaView edges` changed from `["bottom"]` to `["top", "bottom"]`
- Added white header `View` (56px min-height, `flexDirection: row`) between SafeAreaView and ScrollView
- Back arrow: `ArrowLeft size={22} color="#0d9488"` — no circular background, clean icon
- Event name: `fontSize: 17, fontWeight: "700", color: "#0f172a", numberOfLines: 1`
- Date/location subtitle: `fontSize: 12, color: "#64748b"` below the name
- Date badge moved from hero overlay to header bar right side
- `HERO_HEIGHT` reduced from 260 to 190
- Removed bottom text scrim `LinearGradient` from hero
- Removed back arrow, event name text block, and date badge from inside the hero `<View>`
- Removed unused `StatusBar` and `Platform` imports from react-native

## Deviations from Plan

None — plan executed exactly as written.

## Verification Criteria

- Back arrow is in a white header bar, NOT floating over the banner
- Event name and date appear in the header bar
- Hero banner shows just the image/gradient without any overlaid text or buttons
- Date badge (UPCOMING/TODAY/PAST) shown at right of header bar
- All module cards, countdown, wishlist progress still render correctly
- Back button navigates back correctly
- Safe area insets respected (edges top+bottom)
