---
phase: 32
plan: "05"
name: edit-event-details bug fixes
subsystem: mobile-screens
tags: [expo-file-system, datetimepicker, react-native, ui-fix]

dependency-graph:
  requires: []
  provides:
    - Working cover photo base64 reading (expo-file-system File class API)
    - Native date/time picker for event date field
    - Full-width Save Changes button
  affects:
    - edit-event-details.tsx (fully functional for cover photo + date editing)

tech-stack:
  added:
    - "@react-native-community/datetimepicker" (npm --ignore-scripts)
  patterns:
    - new File(uri).base64() pattern for expo-file-system v55+
    - Platform-conditional DateTimePicker (inline on iOS, default on Android)

file-tracking:
  created: []
  modified:
    - apps/gatherly-mobile/app/edit-event-details.tsx
    - apps/gatherly-mobile/package.json
    - apps/gatherly-mobile/package-lock.json

decisions:
  - label: "Use new File(uri).base64() instead of readAsStringAsync"
    rationale: "expo-file-system v55 removed readAsStringAsync from default export; File class API is the documented replacement"
  - label: "Pressable + DateTimePicker replaces raw TextInput"
    rationale: "Native picker provides correct UX; TextInput required manual ISO string entry which was error-prone"
  - label: "width:'100%' on Button style"
    rationale: "ScrollView context caused Button to shrink-wrap; explicit width ensures ButtonText is never clipped"

metrics:
  duration: "~8m"
  completed: "2026-03-22"
---

# Phase 32 Plan 05: edit-event-details Bug Fixes Summary

**One-liner:** Replaced deprecated `readAsStringAsync` with `File.base64()`, wired native `DateTimePicker` for event date selection, and fixed Save button width clipping.

## What Was Done

Three gap-closure fixes applied to `apps/gatherly-mobile/app/edit-event-details.tsx`:

### Fix 1: Cover Photo Base64 Reading (Task 1)

Removed `import * as FileSystem from "expo-file-system"` and replaced `FileSystem.readAsStringAsync(uri, { encoding: 'base64' })` with the new `File` class API:

```typescript
import { File } from "expo-file-system";
// ...
const file = new File(asset.uri);
const base64 = await file.base64();
```

This eliminates the deprecation crash in expo-file-system v55+.

### Fix 2: Native DateTimePicker for Event Date (Task 2)

Installed `@react-native-community/datetimepicker` (npm --ignore-scripts). Replaced the raw `TextInput` date field with:
- A `Pressable` that shows the formatted date or placeholder text
- A conditional `DateTimePicker` rendered below when `showDatePicker === true`
- Platform-conditional display: `"inline"` on iOS, `"default"` on Android
- On Android the picker dismisses itself; on iOS it stays inline until user navigates away

### Fix 3: Save Button Width (Task 2)

Added `width: "100%"` to the Save Button's inline style. Without this, `ScrollView` caused the button to shrink-wrap its content, clipping "Save Changes" text behind the `ButtonSpinner`.

## Verification

- `readAsStringAsync` — 0 occurrences in file
- `new File(asset.uri)` — present at line 86
- `DateTimePicker` imported and rendered conditionally — lines 14, 265
- `width: "100%"` on Save Button — line 317
- `pnpm check-types` — 0 errors for edit-event-details.tsx

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash    | Description                                             |
|---------|---------------------------------------------------------|
| 3b5d19d | fix(32-05): fix cover photo picker, native date picker, save button width |
