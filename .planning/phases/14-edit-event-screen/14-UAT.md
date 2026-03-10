---
status: complete
phase: 14-edit-event-screen
source: 14-01-SUMMARY.md, 14-02-SUMMARY.md
started: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Add Participant via Invite Modal
expected: Tapping "+ Add Participant" opens an invite modal with a QR code, a copyable link row, and a Share button.
result: pass

### 2. Copy and Share Invite Link
expected: Tapping the copy icon in the invite modal copies the magic link URL to clipboard. Tapping Share opens the native share sheet with the link.
result: pass

### 3. Remove Participant
expected: Each participant appears as a chip with an X button. Tapping X removes that participant from the event immediately.
result: pass

### 4. Gift Count Stepper
expected: A stepper in the settings section lets the organizer increment or decrement the gifts-per-person count. Minimum is 1, maximum is one less than the total participant count.
result: pass

### 5. Partner Exclusions Toggle
expected: A "Partner Exclusions" switch is visible in settings. Toggling it saves immediately to the API (no separate save button needed).
result: pass

### 6. Manage Exclusions Screen
expected: Tapping "Manage Exclusions" navigates to a separate screen. Tapping two participant chips creates an exclusion pair. Tapping Save (or back) persists the pairs.
result: pass

### 7. Generate Assignments
expected: Tapping Generate shows a spinner while the API call is in-flight, then assignments appear. After generation, add/remove participant controls are hidden or disabled (locked state).
result: pass

### 8. Secret Access Codes
expected: After generating assignments, a "Secret Access Codes" section appears. Each participant's code is masked by default (dots). Tapping the Eye icon reveals the code. Tapping Copy flashes a checkmark briefly.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
