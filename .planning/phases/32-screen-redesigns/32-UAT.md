---
status: complete
phase: 32-screen-redesigns
source: 32-01-SUMMARY.md, 32-02-SUMMARY.md, 32-03-SUMMARY.md
started: 2026-03-22T05:00:00Z
updated: 2026-03-22T05:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Event Hub Hero (cover photo or gradient fallback)
expected: Open an event that has NO cover photo set. The top of Event Details should show a teal gradient hero background with the event name, date, and location overlaid at the bottom. No broken image or blank space.
result: pass

### 2. Cover photo renders when set
expected: Open an event that HAS a cover photo. The hero at the top of Event Details should show the actual cover photo image (full-bleed, filling the hero area), with the event name and date overlaid on top via a gradient scrim.
result: issue
reported: "Cover photos cannot be changed. Getting an error: Failed to read image: Method readAsStringAsync imported from 'expo-file-system' is deprecated. Also events list has different colors to the event hub, they should be the same colors but with a gradient on both"
severity: major

### 3. Date badge on Event Hub
expected: The Event Hub hero shows a small badge near the top: "TODAY" if the event is today, "UPCOMING" if it's in the future, "PAST" if it has already passed. The badge color/label matches the event date.
result: pass

### 4. "Organized by" line
expected: Below the hero on Event Details, there is an "Organized by [Name]" line showing the organizer's name. For events you created yourself, it shows your name.
result: pass

### 5. Module cards with category grouping
expected: The Event Details screen shows modules grouped under labeled category headers: ACTIVITY, COLLABORATION, and MEMORIES. Cards for Gift Exchange, Potluck appear under their respective categories. The layout matches a card grid, not a flat list.
result: issue
reported: "The layout is messed up, not the same as the template at all. Plus the section 'Your Secret Assignment' and the 'View Wishlists' and 'Add My Gifts' buttons are showing in the main event hub, but it should only be showing in the secret santa module."
severity: major

### 6. Coming Soon / locked module cards
expected: Modules that aren't implemented yet (White Elephant, Expense Splitter, Photo Gallery) appear as greyed-out cards with a "Coming Soon" or locked appearance. Their toggles or tap areas are disabled.
result: pass

### 7. Potluck card tap shows toast
expected: Tapping the Potluck module card on Event Details shows a brief toast or alert message ("Potluck screen coming soon" or similar). It does NOT crash or navigate to a blank screen.
result: issue
reported: "Nothing happens"
severity: minor

### 8. New event does NOT auto-add Gift Exchange module
expected: Create a brand new event. Go to its Event Details / Module Config screen. Gift Exchange should NOT be automatically active — the modules list should be empty or require the user to manually enable it.
result: pass

### 9. Manage Event 4-section layout
expected: From Event Details, tap the Manage / Edit button (organizer only). The Manage Event screen shows 4 sections: (1) an Event Details card with a pencil/Edit link, (2) a Guest List section with avatars + invite button, (3) an Active Modules section, and (4) Global Settings toggles (Allow Guest Invites, Public Event).
result: pass

### 10. Edit Event Details sub-screen (cover photo + fields)
expected: On Manage Event, tap the pencil/Edit link on the Event Details card. A sub-screen opens with fields for event name, date/time, and location, plus a cover photo picker. Changing values and tapping Save updates the event.
result: issue
reported: "The save button's text is being cut off and the datepicker should be an actual datepicker but it is an input box"
severity: major

### 11. Module Config categories + auto-save
expected: Navigate to Module Config (from Manage Event or Event Hub). Modules are grouped under ACTIVITY, COLLABORATION, MEMORIES category headers. Toggling a module saves immediately (no Save button needed). Coming Soon modules have a badge and their toggle is disabled.
result: issue
reported: "It does save, but isn't updated immediately under the Edit Event screen as well as the Event Hub."
severity: major

### 12. Global settings toggles on Manage Event
expected: On Manage Event, the Global Settings section has two toggles: "Allow Guest Invites" and "Public Event". Toggling either one saves automatically and the state persists when you leave and return to the screen.
result: pass

## Summary

total: 12
passed: 7
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "Cover photo can be picked and saved from edit-event-details sub-screen; hero renders the chosen photo"
  status: failed
  reason: "User reported: Cover photos cannot be changed. Getting an error: Failed to read image: Method readAsStringAsync imported from 'expo-file-system' is deprecated. Also events list has different colors to the event hub, they should be the same colors but with a gradient on both"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Module cards grouped under ACTIVITY/COLLABORATION/MEMORIES category headers matching the template; Secret Assignment/View Wishlists/Add My Gifts content scoped inside Gift Exchange module only"
  status: failed
  reason: "User reported: The layout is messed up, not the same as the template at all. Plus the section 'Your Secret Assignment' and the 'View Wishlists' and 'Add My Gifts' buttons are showing in the main event hub, but it should only be showing in the secret santa module."
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Tapping Potluck module card shows a toast/alert message (Potluck screen coming soon)"
  status: failed
  reason: "User reported: Nothing happens"
  severity: minor
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Edit Event Details sub-screen has a native date picker and a Save button with fully visible text"
  status: failed
  reason: "User reported: The save button's text is being cut off and the datepicker should be an actual datepicker but it is an input box"
  severity: major
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Module toggle changes in Module Config are immediately reflected in Active Modules section on Edit Event screen and module cards on Event Hub"
  status: failed
  reason: "User reported: It does save, but isn't updated immediately under the Edit Event screen as well as the Event Hub."
  severity: major
  test: 11
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
