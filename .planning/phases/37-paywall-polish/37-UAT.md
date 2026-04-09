---
status: testing
phase: 37-paywall-polish
source: [37-01-SUMMARY.md]
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 3
name: Participant sees "Ask organiser" copy in PaywallModal (edit event / potluck screens)
expected: |
  When a magic-link participant hits the participant cap in Edit Event, or sees a PaywallModal
  from Potluck Setup, the modal shows participant copy (no upgrade CTA). An organizer sees the
  organizer upgrade CTA in the same scenarios.
awaiting: user response

## Tests

### 1. Participant sees "Ask organiser" copy in PaywallModal (polls screen)
expected: When a magic-link participant (joined via invite link, not a registered account) is on the Polls screen and taps a locked/premium feature that opens the PaywallModal, they should see "Ask your organiser to upgrade this event" copy with NO upgrade CTA button. An organizer on the same screen should see the normal "Request Access" CTA.
result: pass

### 2. Participant sees "Ask organiser" copy in PaywallModal (module config screen)
expected: When a magic-link participant opens Module Config and taps a locked/coming-soon premium module, the PaywallModal shows "Ask your organiser to upgrade this event" with no upgrade button. An organizer sees the upgrade CTA.
result: pass

### 3. Participant sees "Ask organiser" copy in PaywallModal (edit event / potluck screens)
expected: When a magic-link participant hits the participant cap in Edit Event, or sees a PaywallModal from Potluck Setup, the modal shows participant copy (no upgrade CTA). An organizer sees the organizer upgrade CTA in the same scenarios.
result: [pending]

### 4. trial_limit_reached 403 on polls opens PaywallModal
expected: When the API returns a trial_limit_reached 403 on poll creation (e.g., trying to create a 2nd poll on a free event from a stale state), the Polls screen opens the PaywallModal instead of showing a generic error toast.
result: [pending]

### 5. trial_limit_reached 403 on potluck category opens PaywallModal
expected: When the API returns a trial_limit_reached 403 on potluck category creation (e.g., creating a 4th category on a free event from a stale client state), the Potluck Setup screen opens the PaywallModal instead of a generic error/toast.
result: [pending]

### 6. participant_cap_reached 403 on magic-link shows "event full" screen
expected: When a magic-link redemption fails with participant_cap_reached 403 (the event already has 20 participants), the magic-link screen shows an amber warning icon, "This event is full" heading, an explanation message, and a "Go Back" button — instead of the generic error state.
result: [pending]

## Summary

total: 6
passed: 2
issues: 0
pending: 4
skipped: 0

## Gaps

[none yet]
