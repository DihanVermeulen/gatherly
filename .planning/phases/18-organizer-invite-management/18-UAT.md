---
status: complete
phase: 18-organizer-invite-management
source: 22-24-SUMMARY.md (invite management sections), ROADMAP.md Phase 18 success criteria
started: 2026-03-11T00:00:00Z
updated: 2026-03-11T00:01:00Z
---

## Current Test

[testing complete]

## Tests

### 1. View Invite List
expected: Open the Edit Event screen for an event that has had invites created. An "Invites" card is visible (when the event is not locked), listing each invite with participant name and a status badge — "Pending" or "Accepted".
result: pass

### 2. Resend Magic Link
expected: For a Pending invite, tap the "Resend" button next to that participant. The button triggers a new magic link email to be sent. No error is shown — the UI continues normally (fire-and-forget, so no explicit success toast is required, but the app should not crash or show an error).
result: pass

### 3. Revoke Pending Invite
expected: For a Pending invite, tap the revoke (X) button. The invite is removed from the list immediately. If the revoked link is used afterward, it should no longer work (shows invalid/expired state in the Join screen).
result: pass

### 4. Invite List Refreshes After Creating Invite
expected: On the Edit Event screen, tap "Add Participant" and generate a new invite code/QR code. After the invite is created, the Invites card updates automatically to include the new invite entry without needing a manual pull-to-refresh.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
