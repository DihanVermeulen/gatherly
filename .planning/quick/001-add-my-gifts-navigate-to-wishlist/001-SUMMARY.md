---
phase: quick
plan: 001
subsystem: ui
tags: [react, navigation, wishlist, auth, react-router]

requires:
  - phase: 02-wishlist-core
    provides: WishlistPage at /events/:eventId/wishlist/:participantId
  - phase: 07-jwt-authentication
    provides: AuthContext with useAuth hook and user.name

provides:
  - "Add My Gifts" button in EventDetailsPage navigates to the authenticated user's wishlist page
  - Graceful disabled state when user is not a participant in the event

affects: [event-details, wishlist-navigation]

tech-stack:
  added: []
  patterns:
    - "Match auth user to participant by name to resolve participantId for navigation"
    - "Disable action buttons with opacity-50/cursor-not-allowed when precondition not met"

key-files:
  created:
    - apps/gatherly/src/pages/events/details.tsx
  modified: []

key-decisions:
  - "Match user to participant by name (user.name === participant.name) since no participant-to-user FK exists"
  - "Disable button rather than hide it when user is not a participant, for discoverability"

patterns-established:
  - "Participant lookup via name match against participantDetails for navigation context"

duration: 1min
completed: 2026-02-14
---

# Quick Task 001: Add My Gifts Navigate to Wishlist Summary

**"Add My Gifts" button in EventDetailsPage now navigates to /events/:id/wishlist/:participantId for the authenticated user, with disabled state when user is not a participant**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-14T05:05:22Z
- **Completed:** 2026-02-14T05:06:30Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Fixed "Add My Gifts" button to navigate to the user's personal wishlist page instead of the shared gifts page
- Added participant lookup using `useAuth` user name matched against `participantDetails`
- Implemented graceful disabled state (opacity-50, cursor-not-allowed, `disabled` attribute) when user is not a participant in the event
- "View All Gifts" button left unchanged, still navigates to `/events/:id/gifts`

## Task Commits

1. **Task 1: Update "Add My Gifts" button to navigate to wishlist page** - `4b9f48a` (feat)

## Files Created/Modified

- `apps/gatherly/src/pages/events/details.tsx` - Added `useAuth` import, `currentParticipant` lookup by name match, updated "Add My Gifts" onClick to navigate to `/events/:id/wishlist/:participantId` with disabled state when no match

## Decisions Made

- Match user to participant by `user.name === p.name` since there is no foreign key linking auth users to participant records. This is consistent with how the edit page resolves participant IDs.
- Button disabled (not hidden) when user is not a participant, preserving discoverability while communicating the unjoined state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wishlist navigation from event details is now correct
- Future improvement: if participant-to-user FK is added to the schema, the name-based match can be replaced with a direct ID lookup for robustness

---
*Phase: quick-001*
*Completed: 2026-02-14*
