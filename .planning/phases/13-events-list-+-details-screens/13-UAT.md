---
status: diagnosed
phase: 13-events-list-+-details-screens
source: 13-01-SUMMARY.md, 13-02-SUMMARY.md
started: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Events Screen Layout
expected: Events screen shows colored hero cards with event initial, Active/Planning status badge, stats row, filter pills, and search bar
result: pass

### 2. Filter Pills
expected: Tapping "Active" pill shows only active events (those with assignments generated). Tapping "Planning" shows events with no assignments. "All" restores full list.
result: pass

### 3. Search Bar
expected: Typing in the search bar filters the events list to show only events whose name matches the query. Clearing the input restores the full list.
result: pass

### 4. Create Event
expected: Tapping the create button opens a form/prompt. After submitting a name, the new event appears in the list immediately with a Planning badge (no assignments yet).
result: pass

### 5. Delete Event
expected: Triggering delete on an event shows a confirmation dialog. Confirming removes the event from the list. Cancelling leaves it in place.
result: pass

### 6. Navigate to Event Details
expected: Tapping an event card navigates to the Event Details screen for that event.
result: pass

### 7. Hero Color Consistency
expected: The hero block color on the Event Details screen matches the color of the same event's card in the Events list.
result: pass

### 8. Secret Assignment Card
expected: The assignment card shows one of three states: "Assignments not generated yet" (if none generated), "No assignment found" (if generated but user not matched), or a reveal toggle with Eye icon showing the assigned person's name when tapped.
result: pass

### 9. Participant List
expected: Event Details shows all participants. The current user's row has a "(you)" label and an Organizer or Participant role badge. Other participants show their name and badge. Each row has an Avatar.
result: issue
reported: "I'm not seeing my own row..."
severity: major

### 10. Gift Action Buttons
expected: Two buttons appear at the bottom of Event Details: "View All Gifts" (outline style) and "+ Add My Gifts" (filled/primary style).
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Current user's row appears in participant list with (you) label and role badge"
  status: failed
  reason: "User reported: I'm not seeing my own row..."
  severity: major
  test: 9
  root_cause: "event.people only contains participants explicitly added to the event. The organizer is not auto-added as a participant on creation. event-details.tsx line 342 checks `name === user?.name` which can only match if the organizer is already in event.people with the same name string."
  artifacts:
    - path: "apps/gatherly-mobile/app/event-details.tsx"
      issue: "line 342 — isCurrentUser check only works if organizer is in event.people; no fallback to inject organizer row"
    - path: "apps/api/src/routes/events.ts"
      issue: "POST /events does not auto-insert the organizer into the participants table on event creation"
  missing:
    - "Auto-add organizer as participant on event creation (backend), OR inject organizer row in event-details.tsx when user.name not found in event.people"
  debug_session: ""
