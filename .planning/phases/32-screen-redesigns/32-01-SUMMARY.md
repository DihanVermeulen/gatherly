---
phase: 32-screen-redesigns
plan: 01
subsystem: ui
tags: [react-native, expo, expo-linear-gradient, event-hub, module-cards, full-bleed-hero]

# Dependency graph
requires:
  - phase: 30-infrastructure-migration-and-api
    provides: coverPhotoUrl, location, allowGuestInvites, isPublic fields on events API; GET /api/users/me profile data
  - phase: 25-event-modules
    provides: event_modules table, modulesApi.getModules(), TEventModule type
affects:
  - 32-02-edit-event (Manage All button links to edit-event screen)
  - 33-potluck-screens (potluck module card shows toast until Phase 33 ships its screen)

provides:
  - Full-bleed cover photo hero (or teal gradient fallback) on Event Details screen with overlaid event name, date, location
  - Date-based badge (TODAY/UPCOMING/PAST) computed from event.eventDate
  - "Organized by [name]" line sourced from new organizerName API field
  - Module cards grouped under ACTIVITY, COLLABORATION, MEMORIES category headers
  - All 7 modules shown including unimplemented ones (White Elephant, Expense Splitter, Photo Gallery) as greyed-out locked cards
  - Gift Exchange status line ("Assignments generated" / "Setup needed")
  - Potluck tap shows toast fallback; polls/rsvp navigate to their screens
  - Stack.Screen registrations for polls, rsvp, modules-config in _layout.tsx
  - organizerName field in GET /api/events/:id response (via users table lookup)
  - gift_exchange auto-insert removed from POST /api/events
  - TEvent type extended with coverPhotoUrl, location, allowGuestInvites, isPublic, organizerName

# Tech tracking
tech-stack:
  added:
    - expo-linear-gradient (gradient rendering in hero)
  patterns:
    - MODULE_CATALOG constant pattern — all possible modules defined client-side as static catalog, not derived from API; API provides only active module list
    - Full-bleed hero pattern — Image or LinearGradient + LinearGradient scrim overlay + absolutely positioned controls + text at bottom

key-files:
  created: []
  modified:
    - apps/api/src/routes/events.ts
    - apps/gatherly-mobile/app/api/events.ts
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/app/_layout.tsx
    - apps/gatherly-mobile/package.json

key-decisions:
  - "MODULE_CATALOG defined client-side (static) — full catalog of all possible modules with category + comingSoon flags; API active modules list drives which cards are tappable"
  - "expo-linear-gradient used for teal gradient fallback AND bottom scrim overlay — two LinearGradient layers in hero"
  - "Potluck card shows useToast toast fallback (Phase 33 will add the actual screen)"
  - "gift_exchange auto-insert removed from POST /api/events — modules should be managed explicitly via modules-config screen"
  - "organizerName fetched via separate query on users table when organizer_id present — gracefully returns null for legacy events without organizer"

patterns-established:
  - "MODULE_CATALOG pattern: define full module catalog as static TypeScript constant with type, label, description, icon factory, category, and comingSoon flag — API active list gates interactivity"
  - "Full-bleed hero: View with fixed height, Image/LinearGradient as position:absolute background, second LinearGradient scrim for text legibility, text and controls absolutely positioned over"

# Metrics
duration: 18min
completed: 2026-03-22
---

# Phase 32 Plan 01: Event Hub Screen Redesign Summary

**Event Details screen rebuilt as an Event Hub with full-bleed cover photo hero (or teal gradient), date badge, organizer line, and categorized module cards using expo-linear-gradient; API now returns organizerName and no longer auto-inserts gift_exchange**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-22T03:48:39Z
- **Completed:** 2026-03-22T04:06:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Rewrote event-details.tsx (598 lines) matching the Details.png template with full-bleed hero, date badge, organizer line, and module card grid
- Added organizerName to GET /api/events/:id via users table lookup; removed gift_exchange auto-insert from POST /api/events
- Extended TEvent type with Phase 32 fields; registered missing Stack.Screen entries for polls, rsvp, modules-config in _layout.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend API changes + TEvent type update** - `a700fec` (feat)
2. **Task 2: Rewrite event-details.tsx as Event Hub + register missing Stack.Screen entries** - `fda08da` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/api/src/routes/events.ts` - Added organizerName query to GET /events/:id; removed gift_exchange auto-insert from POST /events
- `apps/gatherly-mobile/app/api/events.ts` - TEvent type extended with coverPhotoUrl, location, allowGuestInvites, isPublic, organizerName
- `apps/gatherly-mobile/app/event-details.tsx` - Full rewrite as Event Hub: full-bleed hero, date badge, organizer line, categorized module cards
- `apps/gatherly-mobile/app/_layout.tsx` - Added Stack.Screen entries for polls, rsvp, modules-config in Stack.Protected block
- `apps/gatherly-mobile/package.json` - Added expo-linear-gradient dependency

## Decisions Made
- MODULE_CATALOG defined client-side as static TypeScript constant — full catalog of all 7 possible modules with category grouping and comingSoon flags; API's active modules list gates which cards are tappable/colored
- expo-linear-gradient used for both the teal gradient fallback background AND the bottom scrim overlay for text legibility in the hero
- Potluck card tap shows useToast toast ("Potluck screen coming soon") — Phase 33 will ship the actual potluck screen
- gift_exchange auto-insert removed from POST /api/events — modules are now managed explicitly via the modules-config screen
- organizerName fetched via a separate SELECT on users table when organizer_id is present; returns null gracefully for legacy events with no organizer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in GlueStack UI's own components (bottomsheet, table) unrelated to this phase's changes — confirmed by checking that no errors appear in our modified files

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Event Hub screen is fully functional and matches the Details.png template
- polls, rsvp, modules-config Stack.Screen entries now registered — navigation to these screens will work
- Phase 33 (Potluck Screens) can add potluck.tsx and the toast fallback will automatically become a real navigation
- Edit Event screen (32-02 or existing) is linked via "Manage All" button for organizers

---
*Phase: 32-screen-redesigns*
*Completed: 2026-03-22*
