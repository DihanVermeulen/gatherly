---
phase: 32-screen-redesigns
plan: 02
subsystem: ui
tags: [react-native, expo, gluestack, modules, event-management, image-picker, file-system]

# Dependency graph
requires:
  - phase: 30-infrastructure
    provides: Events API with location/allowGuestInvites/isPublic/coverPhotoUrl fields
  - phase: 32-screen-redesigns/01
    provides: TEvent type with coverPhotoUrl, edit-event-details Stack.Screen pre-registered in _layout.tsx
provides:
  - Redesigned Manage Event screen (edit-event.tsx) with 4-section layout
  - New edit-event-details sub-screen for editing event metadata with cover photo
  - Redesigned Module Config with category headers, auto-save, Coming Soon badges
affects: [33-potluck-screens, future-organizer-flows]

# Tech tracking
tech-stack:
  added: [expo-file-system]
  patterns:
    - "auto-save on toggle pattern: optimistic update -> API call -> revert on error (no Save button)"
    - "category-grouped module list with ACTIVITY/COLLABORATION/MEMORIES headers"
    - "collapsible guest details section behind Manage toggle"
    - "showToast helper for cross-platform toast (ToastAndroid on Android, Alert on iOS)"

key-files:
  created:
    - apps/gatherly-mobile/app/edit-event-details.tsx
  modified:
    - apps/gatherly-mobile/app/edit-event.tsx
    - apps/gatherly-mobile/app/modules-config.tsx
    - apps/gatherly-mobile/package.json
    - apps/gatherly-mobile/package-lock.json

key-decisions:
  - "expo-file-system EncodingType removed from main export in newer version — use string literal 'base64' instead of FileSystem.EncodingType.Base64"
  - "Gift Exchange is no longer alwaysOn in Module Config — regular toggleable module (alwaysOn concept removed entirely)"
  - "Auto-save on each module toggle replaces Save button — modulesApi.setModules called immediately with all active modules"
  - "showToast helper abstracts ToastAndroid (Android) vs Alert (iOS) for gear icon 'Settings coming soon' message"
  - "edit-event-details was pre-registered in _layout.tsx by plan 32-01 — confirmed present, no duplicate needed"

patterns-established:
  - "Module categories: ACTIVITY (gift_exchange, white_elephant), COLLABORATION (potluck, expense_splitter, polls, rsvp), MEMORIES (photo_gallery)"
  - "comingSoon flag: disabled toggle + grayed opacity + Coming Soon badge — module NOT sent to API"
  - "Cover photo base64: expo-image-picker -> readAsStringAsync(uri, { encoding: 'base64' }) -> data URI prefix added"

# Metrics
duration: 7min
completed: 2026-03-22
---

# Phase 32 Plan 02: Manage Event Redesign + Module Config Redesign Summary

**Compact 4-section Manage Event screen (details card, guest list with avatars, active modules with gear icons, global settings toggles), new edit-event-details sub-screen with cover photo picker, and category-grouped Module Config with auto-save toggles and Coming Soon badges**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-22T03:49:42Z
- **Completed:** 2026-03-22T03:57:08Z
- **Tasks:** 2
- **Files modified:** 5 (3 rewritten, 1 created, 1 package install)

## Accomplishments

- Rewrote edit-event.tsx with compact Event Details card (cover photo thumbnail, name, date, location, pencil Edit link), collapsible Guest List section (overlapping avatars + participant count + invite button), Active Modules section (gear icon -> manage-exclusions for gift_exchange, toast for others), and Global Settings (allowGuestInvites + isPublic toggles wired to eventsApi.update)
- Created edit-event-details.tsx: sub-screen with event name, date/time, location fields + cover photo picker using expo-image-picker + expo-file-system base64 conversion, Save button calls eventsApi.update
- Rewrote modules-config.tsx with ACTIVITY/COLLABORATION/MEMORIES category group headers, Coming Soon badge for white_elephant/expense_splitter/photo_gallery, auto-save on each toggle (optimistic update + revert on error), removed Save button, added free-tier upgrade banner, removed alwaysOn from Gift Exchange

## Task Commits

1. **Task 1: Redesign Manage Event + create edit-event-details sub-screen** - `5c58c90` (feat)
2. **Task 2: Redesign Module Config** - `4c1695c` (feat)

## Files Created/Modified

- `apps/gatherly-mobile/app/edit-event.tsx` - Redesigned Manage Event screen with 4-section layout
- `apps/gatherly-mobile/app/edit-event-details.tsx` - NEW: edit sub-screen for event name/date/location/cover photo
- `apps/gatherly-mobile/app/modules-config.tsx` - Redesigned with categories, auto-save, Coming Soon, upgrade banner
- `apps/gatherly-mobile/package.json` - Added expo-file-system
- `apps/gatherly-mobile/package-lock.json` - Updated lockfile

## Decisions Made

- `expo-file-system` newer API (v4+) moved `EncodingType` enum out of the main export; use the string literal `'base64'` to avoid TS errors
- `alwaysOn` concept removed from Module Config — Gift Exchange is now a regular free module that can be toggled on/off
- Auto-save replaces Save button for cleaner UX; modules saved immediately on each toggle with optimistic update + error revert
- `showToast()` helper created to abstract `ToastAndroid` (Android) vs `Alert.alert()` (iOS) for cross-platform toast support
- `edit-event-details` Stack.Screen was already registered by plan 32-01 — confirmed present, no action needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] expo-file-system EncodingType not in main export**
- **Found during:** Task 1 (edit-event-details cover photo picker)
- **Issue:** `FileSystem.EncodingType.Base64` caused TS2339 error — newer expo-file-system moved EncodingType to ExpoFileSystem.types which is not re-exported
- **Fix:** Used string literal `'base64'` instead of `FileSystem.EncodingType.Base64`
- **Files modified:** apps/gatherly-mobile/app/edit-event-details.tsx
- **Verification:** TypeScript check passes with no new errors
- **Committed in:** 5c58c90 (Task 1 commit)

**2. [Rule 1 - Bug] Gear icon not available in lucide-react-native**
- **Found during:** Task 1 (active modules gear icon)
- **Issue:** `Gear` is not exported by lucide-react-native; would cause runtime error
- **Fix:** Used `Settings` icon instead (semantically equivalent)
- **Files modified:** apps/gatherly-mobile/app/edit-event.tsx
- **Verification:** TypeScript check passes
- **Committed in:** 5c58c90 (Task 1 commit)

**3. [Rule 1 - Bug] TEventModule imported from wrong module**
- **Found during:** Task 1 (edit-event.tsx active modules state)
- **Issue:** Plan said to import from `./api/modules` but TEventModule is defined in `./api/events`
- **Fix:** Separated imports: `modulesApi` from `./api/modules`, `TEventModule` from `./api/events`
- **Files modified:** apps/gatherly-mobile/app/edit-event.tsx
- **Committed in:** 5c58c90 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All were TypeScript/runtime correctness fixes. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Manage Event, edit-event-details, and Module Config screens fully redesigned
- Phase 33 (Potluck Screens) can proceed — potluck module card in Active Modules will navigate to potluck flow when gear icon handling is wired
- No blockers

---
*Phase: 32-screen-redesigns*
*Completed: 2026-03-22*
