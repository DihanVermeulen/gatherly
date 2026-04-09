---
status: resolved
trigger: "GAP-1: Cover photo picker broken + events list colors don't match Event Hub"
created: 2026-03-22T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Focus

hypothesis: confirmed — two independent issues identified
test: static code analysis completed
expecting: n/a
next_action: hand off diagnosis to implementer

## Symptoms

expected: 1) Cover photo can be picked and saved. 2) Events list cards use same teal gradient as Event Hub hero.
actual: 1) readAsStringAsync throws at runtime in expo-file-system v55. 2) Event cards use rotating Tailwind color classes (bg-teal-500, bg-indigo-500, etc.) instead of the teal LinearGradient.
errors: runtime deprecation/missing API error from FileSystem.readAsStringAsync
reproduction: 1) Tap "Change" on cover photo in edit-event-details. 2) Open events list and compare card colors to event-details hero.
started: after upgrade to expo-file-system ^55.0.11

## Eliminated

- hypothesis: ImagePicker itself is broken
  evidence: ImagePicker.launchImageLibraryAsync call is correct; the failure is in the subsequent FileSystem.readAsStringAsync call
  timestamp: 2026-03-22

## Evidence

- timestamp: 2026-03-22
  checked: apps/gatherly-mobile/package.json
  found: expo-file-system is ^55.0.11 (SDK 54/55 era where legacy API was removed)
  implication: FileSystem.readAsStringAsync is no longer available in the default import; must use expo-file-system/legacy or new File class

- timestamp: 2026-03-22
  checked: apps/gatherly-mobile/app/edit-event-details.tsx lines 12, 83-86
  found: import * as FileSystem from "expo-file-system" then FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" })
  implication: this is the deprecated call that throws at runtime in v55

- timestamp: 2026-03-22
  checked: apps/gatherly-mobile/app/(tabs)/index.tsx lines 47-54, 300-321
  found: HERO_COLORS array cycles through bg-teal-500/bg-indigo-500/bg-rose-500/bg-amber-500/bg-emerald-500/bg-violet-500 as Tailwind class strings applied to a plain <View>
  implication: no LinearGradient used; colors rotate by index; definitely does not match Event Hub hero

- timestamp: 2026-03-22
  checked: apps/gatherly-mobile/app/event-details.tsx lines 268-274
  found: LinearGradient colors={["#14b8a6", "#0f766e", "#134e4a"]} start={{x:0,y:0}} end={{x:1,y:1}} — teal-400 → teal-700 → teal-900 diagonal gradient
  implication: this is the target style that event cards should match

## Resolution

root_cause: |
  Issue 1: expo-file-system v55 removed readAsStringAsync from the default export.
  The call at edit-event-details.tsx:83 imports from "expo-file-system" (new API) but
  calls the legacy method, causing a runtime crash when a user picks a cover photo.

  Issue 2: EventCard in (tabs)/index.tsx uses a rotating palette of flat Tailwind color
  classes (heroColor = HERO_COLORS[index % HERO_COLORS.length] applied as className on
  a plain View). The Event Hub hero in event-details.tsx uses expo-linear-gradient with
  colors ["#14b8a6", "#0f766e", "#134e4a"]. The two are visually incompatible.

fix: |
  Issue 1 — two valid options:
    Option A (quick): change the import to `import * as FileSystem from "expo-file-system/legacy"`
    Option B (proper): replace readAsStringAsync with the new File class:
      import { File } from "expo-file-system";
      const fileObj = new File(asset.uri);
      const base64 = await fileObj.base64();   // returns bare base64 string
      setCoverPhotoBase64(`data:image/jpeg;base64,${base64}`);

  Issue 2: Replace the flat-color hero block in EventCard with a LinearGradient using
  the same colors as event-details.tsx. Import LinearGradient from "expo-linear-gradient",
  remove the HERO_COLORS array and heroColor variable, replace:
    <View className={`h-32 ${heroColor} items-center justify-center`}>
  with:
    <LinearGradient
      colors={["#14b8a6", "#0f766e", "#134e4a"]}
      style={{ height: 128, alignItems: "center", justifyContent: "center" }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
  and close with </LinearGradient> instead of </View>.
  If a coverPhotoUrl exists on the event, show the image instead (matching event-details
  logic), otherwise fall back to the gradient.

verification: applied — Fix 1 was already present (new File API); Fix 2 updated EventCard hero to use LinearGradient with cover photo fallback matching event-details.tsx pattern
files_changed:
  - apps/gatherly-mobile/app/(tabs)/index.tsx
