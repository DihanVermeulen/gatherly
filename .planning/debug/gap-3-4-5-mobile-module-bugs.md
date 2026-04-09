---
status: resolved
trigger: "Investigate GAP-3 (potluck tap), GAP-4 (save button clip + date picker), GAP-5 (stale modules after nav)"
created: 2026-03-22T16:07:41Z
updated: 2026-03-22T16:07:41Z
---

## Current Focus

hypothesis: All three bugs confirmed, root causes identified
test: Full file reads of event-details.tsx, edit-event-details.tsx, edit-event.tsx, modules-config.tsx
expecting: Structured findings returned to caller
next_action: COMPLETE — return findings

## Symptoms

expected: GAP-3: tapping potluck card shows a toast; GAP-4: save button text unclipped, date is a native picker; GAP-5: modules refresh after navigating back
actual: GAP-3: nothing happens; GAP-4: button text may clip, date is a plain TextInput; GAP-5: stale module list shown
errors: none thrown — all are silent UX bugs
reproduction: GAP-3: enable potluck module, go to event-details, tap potluck card; GAP-4: open edit-event-details, observe save button and date field; GAP-5: toggle modules in modules-config, navigate back to edit-event or event-details
started: unknown

## Eliminated

- hypothesis: GAP-3 — showToast is undefined in event-details.tsx
  evidence: useToast() IS imported and called at line 155; toast.show() IS called for potluck at lines 216-224
  timestamp: 2026-03-22T16:07:41Z

- hypothesis: GAP-3 — potluck case is missing from the switch statement
  evidence: potluck case exists at lines 215-224 of event-details.tsx
  timestamp: 2026-03-22T16:07:41Z

## Evidence

- timestamp: 2026-03-22T16:07:41Z
  checked: event-details.tsx lines 206-209 (handleModuleTap guard)
  found: "if (!isActive) return;" — the tap is silently swallowed when potluck is not in activeModuleTypes
  implication: potluck is a premium module; on free plan_tier it never enters activeModuleTypes, so the guard fires before the toast case is reached

- timestamp: 2026-03-22T16:07:41Z
  checked: event-details.tsx lines 200-203 (activeModuleTypes construction)
  found: activeModuleTypes built from activeModules filtered to status === "active"; only modules explicitly activated in the DB appear
  implication: potluck shows in MODULE_CATALOG but if not activated in the API it is never in activeModuleTypes — card is rendered as inactive, onPress fires handleModuleTap but returns immediately at the !isActive guard

- timestamp: 2026-03-22T16:07:41Z
  checked: event-details.tsx lines 500-503 (Pressable onPress and disabled)
  found: disabled={!isTappable} where isTappable = isActive && !isComingSoon; also onPress={() => isTappable && handleModuleTap(entry)}
  implication: when potluck is inactive, disabled=true on the Pressable means the press event may not even fire at all on iOS/Android — belt-and-suspenders prevents the toast from ever being reachable

- timestamp: 2026-03-22T16:07:41Z
  checked: edit-event-details.tsx lines 288-299 (Save button)
  found: Button uses className="rounded-2xl py-4" with no explicit flex:1 or width; ButtonSpinner and ButtonText are rendered as siblings inside the Button; no minHeight or width constraint
  implication: GlueStack Button default layout does not guarantee full-width. The ButtonText "Save Changes" with ButtonSpinner sibling can be pushed/clipped if the Button does not have width: "100%" or style={{ width: "100%" }} explicitly set in the inline style prop (only backgroundColor is set there)

- timestamp: 2026-03-22T16:07:41Z
  checked: edit-event-details.tsx lines 236-252 (Date & Time field)
  found: plain React Native TextInput with placeholder "YYYY-MM-DDTHH:MM (e.g. 2026-12-25T18:00)" — no DateTimePicker component used
  implication: user must type the ISO date manually; terrible UX; no native picker

- timestamp: 2026-03-22T16:07:41Z
  checked: apps/gatherly-mobile/package.json for date picker dependencies
  found: @react-native-community/datetimepicker NOT installed; expo-date-picker NOT installed; only expo-image-picker is present
  implication: a native date picker needs @react-native-community/datetimepicker (or expo's wrapper) to be installed first before it can be used

- timestamp: 2026-03-22T16:07:41Z
  checked: edit-event.tsx lines 141-160 (useEffect that loads modules)
  found: useEffect(() => { ... loadModules(); }, [event?.id]) — dependency is event?.id only; no useFocusEffect, no navigation listener, no refetch on screen focus
  implication: when user navigates edit-event -> modules-config -> back, event?.id has not changed so the useEffect does not re-run and activeModules stays stale

- timestamp: 2026-03-22T16:07:41Z
  checked: event-details.tsx lines 162-164 (useEffect that loads modules)
  found: useEffect(() => { modulesApi.getModules(id).then(setActiveModules).catch(() => {}); }, [id]) — same problem: dependency is id only, no focus-based refetch
  implication: navigating event-details -> edit-event -> modules-config -> back to event-details does not retrigger the effect; hub shows stale module state

- timestamp: 2026-03-22T16:07:41Z
  checked: modules-config.tsx — does it push any refresh signal back?
  found: router.back() is used; no global state invalidation, no EventsContext dispatch for modules, no navigation param passed back
  implication: there is no side-channel for modules-config to tell callers to refresh; callers must pull on focus

## Resolution

root_cause: |
  GAP-3: The potluck card tap is gated by isTappable = isActive && !isComingSoon (line 485).
  When potluck is not enabled in the API (i.e. the event is on the free plan or the module was never activated),
  isActive is false, so disabled=true on the Pressable prevents the press, and even if it fired,
  handleModuleTap returns early at line 209 before reaching the toast case. The fix requires
  showing the toast (or an upgrade prompt) for *inactive* non-comingSoon modules, not just active ones.

  GAP-4a (Save button clip): Button at line 289 has no width:"100%" in its inline style prop.
  The className "rounded-2xl py-4" handles padding/radius but GlueStack's Button does not automatically
  stretch to full width inside a ScrollView without an explicit style={{ width: "100%" }} or alignSelf:"stretch".
  When ButtonSpinner is added as a sibling to ButtonText the available text space shrinks and text clips.

  GAP-4b (Date field): Lines 236-252 use a plain TextInput with an ISO string placeholder.
  @react-native-community/datetimepicker is not installed in the project at all.
  The package must be installed and a DateTimePicker component wired in to replace the TextInput.

  GAP-5: Both edit-event.tsx and event-details.tsx load modules in a useEffect with [event?.id]
  or [id] as the dependency. These never re-run when the user navigates back from modules-config
  because the id/event.id does not change. Neither screen imports or uses useFocusEffect from
  @react-navigation/native (available via expo-router). modules-config also does not push any
  refresh signal. The fix is to add useFocusEffect(() => { loadModules(); }) in both screens.

fix: findings returned — no code changes applied in this session
verification: root causes confirmed by direct code reading; no ambiguity
files_changed: []
