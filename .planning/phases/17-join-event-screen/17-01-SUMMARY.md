---
phase: 17-join-event-screen
plan: 01
subsystem: api, mobile
tags: [expo-router, express, postgresql, typescript, invite, react-native]

# Dependency graph
requires:
  - phase: 16-event-wishlists-screen
    provides: completed mobile app feature screens up to wishlists
provides:
  - Extended POST /invites/validate returning organizerName, participantCount, eventDate
  - invitesApi.validate() and invitesApi.accept() mobile API functions with typed responses
  - InvitePreview and JoinResult TypeScript types for join screen
  - pendingInvite.ts module-level utility for invite code survival across auth navigation
  - gestureEnabled: false on join screen preventing swipe-away
  - Pending invite redirect useEffect in RootLayoutNav solving Stack.Protected race condition
affects:
  - 17-02 (join screen UI — consumes all utilities built here)
  - 18-organizer-invite-management (invite creation now stores created_by_user_id)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level variable for transient session state (not AsyncStorage) — pendingInvite.ts pattern
    - consumePendingInviteCode() atomic read-and-clear pattern prevents double-redirect
    - POST-auth redirect with setTimeout(100ms) to let Stack.Protected settle before navigate

key-files:
  created:
    - apps/gatherly-mobile/app/utils/pendingInvite.ts
  modified:
    - apps/api/src/routes/invites.ts
    - apps/api/src/db/schema.sql
    - apps/gatherly-mobile/app/api/invites.ts
    - apps/gatherly-mobile/app/_layout.tsx

key-decisions:
  - "created_by_user_id on invites table (FK to users) — enables organizer name in validate response via LEFT JOIN"
  - "Module-level variable for pending invite code — survives auth navigation within JS session, no AsyncStorage needed"
  - "100ms setTimeout in pending invite redirect — lets Stack.Protected guard finish redirect before /join navigation"

patterns-established:
  - "pendingInvite pattern: setPendingInviteCode before auth navigation, consumePendingInviteCode in layout useEffect after session resolves"
  - "Invite validate response includes full preview context: eventName, organizerName, participantCount, eventDate"

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 17 Plan 01: Join Event Screen — API Layer and Utilities Summary

**Invite validate endpoint extended to return organizerName/participantCount/eventDate, mobile invitesApi gets validate()/accept() with InvitePreview type, and pendingInvite module solves Stack.Protected race condition for post-auth join redirects**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T15:50:03Z
- **Completed:** 2026-02-27T15:51:48Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- Backend validate endpoint now returns all 6 fields the join screen preview requires: eventId, eventName, inviteId, organizerName, participantCount, eventDate
- Mobile invitesApi has typed validate() and accept() methods with InvitePreview and JoinResult types — Plan 02 join screen can import and use immediately
- pendingInvite.ts utility lets join.tsx call setPendingInviteCode before navigating to sign-in/register, with _layout.tsx consuming it post-auth to redirect back to /join
- Join screen gesture disabled (gestureEnabled: false) — users cannot swipe away the join flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend backend validate endpoint and add mobile API functions + pendingInvite utility** - `fc94406` (feat)
2. **Task 2: Update _layout.tsx for join screen gesture + pending invite redirect** - `ebb0283` (feat)

## Files Created/Modified
- `apps/api/src/db/schema.sql` - Added created_by_user_id column to invites table (FK to users ON DELETE SET NULL)
- `apps/api/src/routes/invites.ts` - Extended validate SQL (LEFT JOIN users, subquery participant count), updated response, updated INSERT to store created_by_user_id
- `apps/gatherly-mobile/app/api/invites.ts` - Added InvitePreview type, JoinResult type, invitesApi.validate(), invitesApi.accept()
- `apps/gatherly-mobile/app/utils/pendingInvite.ts` - Created: module-level pending invite code storage with setPendingInviteCode / consumePendingInviteCode
- `apps/gatherly-mobile/app/_layout.tsx` - Added gestureEnabled: false on join screen, added useRouter + pending invite redirect useEffect

## Decisions Made
- **created_by_user_id on invites table:** The invites table had no link to the creating user. Rather than inferring organizer from participants, added a direct FK to users. Stored during invite creation via req.user.id from JWT middleware. This is the cleanest approach and benefits Phase 18 (invite management) as well.
- **Module-level variable for pending invite code:** AsyncStorage is async and adds latency; a module-level variable persists within the JS session and is synchronous. Since the invite code only needs to survive auth navigation (not app restarts), this is the correct minimal approach.
- **setTimeout(100ms) for post-auth redirect:** Stack.Protected navigates the user to (tabs) when session becomes truthy. A 100ms delay ensures that navigation settles before router.replace('/join?token=...') fires, preventing a race condition where both navigations conflict.

## Deviations from Plan

None - plan executed exactly as written. The plan file (17-01-PLAN.md) included two variations of the task description; the more detailed version in the plan file was followed, which specified adding created_by_user_id to both schema.sql and the invite INSERT endpoint.

## Issues Encountered
None.

## User Setup Required
The schema.sql change adds `created_by_user_id` to the invites table. For existing development databases, this column needs to be added:
```sql
ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
```
New installs via `psql -d gatherly -f apps/api/src/db/schema.sql` will get the column automatically.

## Next Phase Readiness
- Plan 02 (join screen UI) can import InvitePreview, JoinResult, invitesApi.validate(), invitesApi.accept() immediately
- setPendingInviteCode is available for join.tsx to call before redirecting unauthenticated users to sign-in/register
- Backend validate endpoint serves the full event preview the join screen needs
- Blocker: join.tsx template screen needs to exist (it does — join.tsx was listed in the app directory)

---
*Phase: 17-join-event-screen*
*Completed: 2026-02-27*
