---
status: testing
phase: 10-inline-assignment-reveal
source: 10-02-SUMMARY.md, 10-03-SUMMARY.md
started: 2026-02-19T00:00:00Z
updated: 2026-02-19T00:00:00Z
---

## Current Test

number: 1
name: Magic link can be reused after first redemption
expected: |
  Click a magic link URL that has already been used once (the one emailed to the participant).
  Instead of showing "This magic link is invalid or has expired", you are logged in as the
  participant and land on the event page.
awaiting: user response

## Tests

### 1. Magic link can be reused after first redemption
expected: Click a magic link URL that has already been used once. Instead of "invalid or expired", you are logged in as the participant and land on the event page.
result: pass

### 2. Resend magic link button visible on edit page
expected: On the event edit page (/events/edit/:id), participants who have accepted an invite via magic link should show a small Send icon button to the right of their name (between name and the X remove button). Participants who have NOT accepted an invite show no Send button.
result: [pending]

### 3. Resend generates a fresh magic link
expected: Clicking the Send icon next to a participant shows a loading state briefly, then shows a green Check icon for about 3 seconds, then reverts to the Send icon. The resend succeeds without a page reload. If the invite had an email address, a new magic link is sent to that address.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

[none yet]
