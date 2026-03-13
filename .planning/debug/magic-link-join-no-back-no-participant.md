---
status: resolved
trigger: "magic-link-join-no-back-no-participant"
created: 2026-03-13T00:00:00Z
updated: 2026-03-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — two independent bugs in [token].tsx
test: full code trace of navigation and events refresh after magic-link redemption
expecting: n/a — investigation complete
next_action: return diagnosis to caller

## Symptoms

expected: After an existing user redeems a magic link, they are added as a participant to the event, the event appears in their events list, and they can navigate normally (back button works).
actual: It takes me to the event, but I can't go back, and also my participant isn't added to the event.
errors: None reported
reproduction: Test 2 in UAT — redeem a magic link, observe navigation and participant state
started: Discovered during Phase 27 UAT

## Eliminated

- hypothesis: Participant record is not created on the backend
  evidence: magicLink.ts lines 115-158 — participant creation and user_id linking work correctly on the server
  timestamp: 2026-03-13

- hypothesis: GET /api/events query doesn't include participant-linked events
  evidence: events.ts lines 65-73 — EXISTS subquery correctly includes events where participants.user_id = $1
  timestamp: 2026-03-13

## Evidence

- timestamp: 2026-03-13
  checked: apps/gatherly-mobile/app/magic-link/[token].tsx line 55
  found: router.replace(`/event-details?id=${eventId}`) — uses replace() not push()
  implication: replace() removes the magic-link screen from navigation stack. No back destination exists.

- timestamp: 2026-03-13
  checked: apps/gatherly-mobile/app/magic-link/[token].tsx line 63
  found: gestureEnabled: false on Stack.Screen — disables iOS swipe-back gesture
  implication: Combined with router.replace(), user is completely stranded on event-details

- timestamp: 2026-03-13
  checked: apps/gatherly-mobile/app/magic-link/[token].tsx lines 34-38
  found: signIn() called but no refreshEvents() called afterwards
  implication: EventsContext fetched events once on mount under old token. After signIn stores new JWT, no re-fetch signal sent. Stale event list doesn't include newly joined event.

## Resolution

root_cause: |
  BUG 1 — No back navigation:
  [token].tsx line 55 uses router.replace() instead of router.push(). This removes the
  magic-link screen from the navigation stack. Additionally Stack.Screen at line 63 has
  gestureEnabled: false which disables iOS swipe-back. Both together strand the user on
  event-details with no navigation escape.

  BUG 2 — Joined event not visible in events list:
  refreshEvents() is never called after signIn() in [token].tsx. The participant record IS
  created correctly in the DB and the backend events query is correct. The problem is
  purely client-side: EventsContext doesn't re-fetch after the new JWT is stored.
  The stale event list in memory doesn't include the newly joined event.

fix: (not applied — diagnose-only mode)
verification: (not applied — diagnose-only mode)
files_changed: []
