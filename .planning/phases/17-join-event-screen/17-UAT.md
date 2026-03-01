---
status: testing
phase: 17-join-event-screen
source: [17-01-SUMMARY.md, 17-02-SUMMARY.md]
started: 2026-02-27T16:00:00Z
updated: 2026-02-27T16:00:00Z
---

## Current Test

number: 1
name: Invite preview loads with event details
expected: |
  Navigate to the join screen with a valid invite token (e.g., open the app with
  a gatherly://join?token=... deep link or navigate manually). You should briefly
  see a skeleton loading state (grey placeholder boxes for the hero, title, and button),
  then it resolves to show: a colored hero block with the event name in large white text,
  the event name as a heading below, participant count, and event date.
awaiting: user response

## Tests

### 1. Invite preview loads with event details
expected: Navigate to the join screen with a valid invite token (deep link or direct navigation). Briefly see skeleton loading state, then: colored hero block with event name, participant count, and event date.
result: [pending]

### 2. Join event as authenticated user
expected: On the preview screen while logged in, tap "Join Event". A full-screen overlay appears with a spinner and "Joining event..." text. After ~1-2 seconds, a success screen shows (checkmark icon, "You're in!", event name). After 2 more seconds, app navigates to the Event Details screen for that event.
result: [pending]

### 3. Join screen cannot be swiped away
expected: While on the join screen (preview or any state), try swiping from the left edge to go back. Nothing should happen — the screen stays put. There is no back button or close button.
result: [pending]

### 4. Already-joined state
expected: Navigate to the join screen with an invite for an event you're already a participant in. Instead of the Join button, you should see "You're already a member" as a heading and "You've already joined [event name]" as text, with a "View Event" button that navigates to Event Details.
result: [pending]

### 5. Invalid or expired invite
expected: Navigate to the join screen with a bad or expired token (e.g., modify the URL with a random string). You should see an error state: triangle warning icon, "This invite is no longer valid" text, and a "Go Home" button that returns to the events list.
result: [pending]

### 6. Unauthenticated user sees invite preview
expected: While logged out, open a valid invite link. The screen shows the skeleton briefly, then the event preview (name, participant count, date). Instead of "Join Event", the button reads "Log in to Join". The invite preview is visible before requiring login.
result: [pending]

### 7. Auto-join after login from invite link
expected: While logged out, open a valid invite link, see the preview with "Log in to Join". Tap it — you land on the sign-in screen. Log in successfully. The app should automatically redirect back to the join screen and auto-join the event, then navigate to Event Details (no second "Join" tap required).
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
