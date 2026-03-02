---
status: complete
phase: 19-offline-storage-strategy-sqlite-migration
source: 19-01-SUMMARY.md, 19-02-SUMMARY.md, 19-03-SUMMARY.md
started: 2026-03-02T10:38:37Z
updated: 2026-03-02T10:40:30Z
---

## Current Test

[testing complete]

## Tests

### 1. App launches without crash
expected: Opening the app starts normally with no errors or white screens. SQLite initializes silently in the background — the user sees the normal loading state and then the Events screen (if logged in) or Login screen.
result: pass

### 2. Cached events shown when offline
expected: After loading the app once with a network connection (so events are fetched and cached), turn off wifi/mobile data and reopen the app. The Events screen shows the previously loaded events from the SQLite cache — not a blank list or error.
result: pass

### 3. Offline banner appears when disconnected
expected: With the app open, turn off wifi and mobile data. An amber banner appears saying something like "You're offline — showing cached data". It should appear near the top of the screen.
result: pass

### 4. Offline banner hides when reconnected
expected: While the offline banner is visible, turn wifi back on. The amber banner disappears automatically without needing to restart the app.
result: pass

### 5. Mutations blocked while offline
expected: While offline (with the banner showing), try to create a new event or edit an existing one. The action should not execute — the mutation is paused by React Query and nothing is sent to the server. No partial state change or misleading success feedback.
result: pass

### 6. Sign out clears cached data
expected: Sign out of the app. The cache is cleared as part of sign-out. If you sign back in with a different account (or the same), the app loads fresh data from the API rather than showing stale cached events from the previous session.
result: issue
reported: "The cache has not been cleared when signed out. And when signing in with a different account; the other account's cache still remains and displays that account's events"
severity: major

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Sign out clears the SQLite cache so no stale or cross-account data is visible after logout"
  status: failed
  reason: "User reported: The cache has not been cleared when signed out. And when signing in with a different account; the other account's cache still remains and displays that account's events"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
