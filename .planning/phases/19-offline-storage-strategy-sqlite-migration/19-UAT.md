---
status: testing
phase: 19-offline-storage-strategy-sqlite-migration
source: [19-01-SUMMARY.md, 19-02-SUMMARY.md, 19-03-SUMMARY.md]
started: 2026-03-01T00:00:00Z
updated: 2026-03-01T00:00:00Z
---

## Current Test

number: 6
name: Cache cleared on sign out
expected: |
  Sign out of the app. Sign in as a different user (or sign back in
  as the same user with internet disabled). No events from the
  previous session bleed into the new session — the events list
  reflects only the current user's data.
awaiting: user response

## Tests

### 1. App launches without crashing
expected: After the SQLite integration, the app launches normally — Login or Events screen appears without any crash, white screen, or error overlay.
result: pass

### 2. Events cached in SQLite — offline cold start
expected: After loading events while connected, disconnect from the network, force-quit the app, then reopen it. Events should still appear (loaded from SQLite cache) rather than showing empty or an error screen.
result: pass

### 3. Offline banner appears when network drops
expected: While the app is open and events are visible, toggle off wifi/data on the device. An amber banner should appear showing "You're offline — showing cached data" (or similar wording).
result: pass

### 4. Offline banner hides when reconnected
expected: After the offline banner appears (from test 3), turn wifi/data back on. The amber banner should automatically disappear without requiring a manual refresh or restart.
result: pass

### 5. Mutations blocked when offline
expected: While offline (banner visible), attempt to create a new event or delete an existing one. The action should not fire — no network request goes out, the UI doesn't crash, and no partial/corrupted state appears. (The button may appear to do nothing, or show a subtle indication it's blocked.)
result: issue
reported: "When deleting an event, it did disappear from the events list"
severity: major

### 6. Cache cleared on sign out
expected: Sign out of the app. Sign in as a different user (or sign back in as the same user with internet disabled). No events from the previous session bleed into the new session — the events list reflects only the current user's data.
result: [pending]

## Summary

total: 6
passed: 4
issues: 1
pending: 1
skipped: 0

## Gaps

- truth: "Deleting an event while offline should not fire — event stays in the list until reconnected"
  status: failed
  reason: "User reported: When deleting an event, it did disappear from the events list"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
