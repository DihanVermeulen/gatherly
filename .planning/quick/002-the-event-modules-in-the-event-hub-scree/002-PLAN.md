---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/gatherly-mobile/app/event-details.tsx
autonomous: true
must_haves:
  truths:
    - "Module cards match the Details.png screen template layout"
    - "Each category has a small uppercase header label"
    - "Module rows are individual flat rows — NOT wrapped in a grouped bordered container"
    - "Only active modules shown with their real status; inactive/coming-soon modules still visible but visually muted"
    - "Active modules show contextual status text on the right side (e.g., status badge or item count)"
  artifacts:
    - path: "apps/gatherly-mobile/app/event-details.tsx"
      provides: "Redesigned Event Hub module cards"
  key_links:
    - from: "event-details.tsx module cards"
      to: "Details.png screen template"
      via: "visual match"
---

<objective>
Fix the Event Hub modules section in event-details.tsx to match the Details.png screen template.

Purpose: The current module cards look broken — they use a grouped bordered container per category that doesn't match the design. The template shows individual flat module rows under category headers with status info on the right.

Output: Visually correct Event Hub module section matching the screen template.
</objective>

<execution_context>
@C:\Users\dihan\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\dihan\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/gatherly-mobile/app/event-details.tsx
@apps/gatherly-mobile/screen-templates/Details.png
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign Event Hub module cards to match Details.png template</name>
  <files>apps/gatherly-mobile/app/event-details.tsx</files>
  <action>
Redesign the "Module cards grouped by category" section (lines ~478-581) in event-details.tsx to match the Details.png screen template. Key changes:

1. **Remove the outer grouped bordered container** per category. Currently each category wraps all its modules in a `View` with `borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0"`. Remove this wrapper entirely.

2. **Category headers stay** — keep the small uppercase category label (ACTIVITY, COLLABORATION, MEMORIES) but add a right-aligned status element if applicable. In the template, ACTIVITY has a "Setup Complete" teal pill badge to the right of the category name. Implement this: for ACTIVITY category, if gift_exchange is active AND has assignments, show a small teal pill badge "Setup Complete". Use a `flexDirection: "row", justifyContent: "space-between"` wrapper for category header.

3. **Module rows as individual flat cards** — each module row should be its own card-like row:
   - Use a `View` with `borderRadius: 12, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 8, overflow: "hidden"` for each module row (NOT grouped together)
   - Inside: `Pressable` with `flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12`
   - Left: icon circle (40x40, borderRadius: 12, teal bg for active, gray for inactive)
   - Center: `View flex:1` with module name (fontSize: 15, fontWeight: "600") and description below (fontSize: 12, color: "#64748b")
   - Right: `ChevronRight` for tappable active modules, `Lock` for coming soon, nothing for inactive

4. **Status text on the right** — for active modules, show contextual status text right-aligned before the chevron:
   - gift_exchange: show item count like "{claimedCount}/{totalWishlistCount} items" if available, or "Setup needed" / "Assignments ready"
   - polls/rsvp/potluck: show "Active" in teal text
   - Place this as a `Text` with `fontSize: 11, color: "#64748b", marginRight: 4`

5. **Keep all existing logic intact**: handleModuleTap, activeModuleTypes set, comingSoon behavior, disabled states, toast for inactive modules. Only change the JSX structure and styling of the module cards section.

6. **Keep the same module visibility rules**: show ALL catalog entries (active modules are fully styled, inactive are muted, coming soon are grayed with lock icon). This matches the existing behavior — the template shows a curated view but the code should still show all modules so users know what's available.
  </action>
  <verify>
Run `cd apps/gatherly-mobile && npx expo export --platform ios 2>&1 | tail -5` to verify no syntax/import errors. Visually verify on device that:
- Module rows are individual cards, not grouped in bordered containers
- Category headers are visible
- Active modules have teal icons and status text
- Inactive modules are visually muted
- Coming soon modules show lock icon
  </verify>
  <done>Event Hub module cards visually match the Details.png screen template — individual flat card rows per module, category headers with optional status badges, status text on the right side of active modules, no grouped bordered containers.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification against screen template</name>
  <what-built>Redesigned Event Hub module cards in event-details.tsx to match Details.png template</what-built>
  <how-to-verify>
1. Open the app on device/simulator
2. Navigate to any event's detail screen
3. Scroll to the "Event Hub" section
4. Compare module card layout with apps/gatherly-mobile/screen-templates/Details.png:
   - Each module should be its own card row (not grouped in a bordered container)
   - Category labels (ACTIVITY, COLLABORATION, MEMORIES) should appear above their groups
   - Active modules should have teal icon circles, module name, description, and status on the right
   - Inactive/coming-soon modules should be visually muted
5. Tap an active module — should navigate correctly
6. Tap an inactive module — should show "Enable in Module Config" toast
  </how-to-verify>
  <resume-signal>Type "approved" or describe what still looks wrong</resume-signal>
</task>

</tasks>

<verification>
- No TypeScript/JSX errors in event-details.tsx
- Module cards render as individual flat rows, not grouped containers
- All existing module tap behavior preserved (navigation, toasts)
- Active/inactive/coming-soon visual states correct
</verification>

<success_criteria>
Event Hub module section visually matches Details.png screen template with individual card rows per module, proper category headers, and status information displayed on each module row.
</success_criteria>

<output>
After completion, create `.planning/quick/002-the-event-modules-in-the-event-hub-scree/002-SUMMARY.md`
</output>
