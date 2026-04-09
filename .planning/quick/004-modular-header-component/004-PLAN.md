---
phase: quick-004
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/gatherly-mobile/components/AppHeader.tsx
  - apps/gatherly-mobile/app/event-details.tsx
  - apps/gatherly-mobile/app/edit-event.tsx
  - apps/gatherly-mobile/app/edit-event-details.tsx
  - apps/gatherly-mobile/app/edit-wishlist-item.tsx
  - apps/gatherly-mobile/app/my-wishlist.tsx
  - apps/gatherly-mobile/app/view-wishlists.tsx
  - apps/gatherly-mobile/app/modules-config.tsx
  - apps/gatherly-mobile/app/polls.tsx
  - apps/gatherly-mobile/app/rsvp.tsx
  - apps/gatherly-mobile/app/manage-exclusions.tsx
autonomous: true

must_haves:
  truths:
    - "All screens with back buttons use the same AppHeader component"
    - "Headers look identical to before — no visual regressions"
    - "Back button navigates back on every screen"
    - "Right actions (Save, Plus, badge) still work on screens that have them"
  artifacts:
    - path: "apps/gatherly-mobile/components/AppHeader.tsx"
      provides: "Reusable header component"
      exports: ["AppHeader"]
  key_links:
    - from: "all screen files"
      to: "AppHeader.tsx"
      via: "import { AppHeader }"
      pattern: "import.*AppHeader"
---

<objective>
Create a reusable `AppHeader` component and replace all inline header blocks across the app.

Purpose: Eliminate duplicated header code (currently copy-pasted across 10 screens with minor variations) and centralize into one component for consistent styling and easier future changes.

Output: `AppHeader.tsx` component + all 10 screens updated to use it.
</objective>

<execution_context>
@C:\Users\dihan\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\dihan\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/gatherly-mobile/app/event-details.tsx (quick-003 header — the "canonical" style to match)
@apps/gatherly-mobile/components/ (existing components directory)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create AppHeader component</name>
  <files>apps/gatherly-mobile/components/AppHeader.tsx</files>
  <action>
Create `apps/gatherly-mobile/components/AppHeader.tsx` with the following design:

```tsx
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

type RightAction = {
  icon?: React.ReactNode;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
};

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: RightAction;
  rightElement?: React.ReactNode;
};
```

**Layout (inline styles, NOT NativeWind):**
- Outer View: `flexDirection: "row"`, `alignItems: "center"`, `backgroundColor: "#ffffff"`, `paddingHorizontal: 12`, `paddingVertical: 10`, `borderBottomWidth: 1`, `borderBottomColor: "#f1f5f9"`, `minHeight: 56`
- This matches the event-details.tsx header exactly.

**Back button (shown when `onBack` is provided):**
- Pressable: `height: 40`, `width: 40`, `alignItems: "center"`, `justifyContent: "center"`, `flexShrink: 0`
- Contains: `<ArrowLeft size={22} color="#0d9488" />`
- onPress calls `onBack`

**Title area (center, flex: 1):**
- View with `flex: 1`, `marginHorizontal: 8`
- Title: `fontSize: 17`, `fontWeight: "700"`, `color: "#0f172a"`, `numberOfLines={1}`
- Subtitle (if provided): `fontSize: 12`, `color: "#64748b"`, `marginTop: 1`, `numberOfLines={1}`

**Right side:**
- If `rightElement` is provided, render it directly (for custom elements like badges).
- If `rightAction` is provided:
  - If `rightAction.label` exists: render a Pressable pill with `backgroundColor: rightAction.style?.backgroundColor || "#0d9488"`, `borderRadius: 20`, `paddingHorizontal: 16`, `height: 40`, centered content. Show `ActivityIndicator` when `loading`, otherwise show the label text (white, bold, 14).
  - If `rightAction.icon` exists (no label): render a 40x40 Pressable circle with the icon.
- If neither, render a 40px wide spacer View to keep title centered.

**Important:** Do NOT include SafeAreaView. The parent screen handles safe area. Do NOT use NativeWind classes — use inline styles only to match event-details.tsx pattern.

Export as named export: `export function AppHeader(props: Props)`
  </action>
  <verify>
File exists at `apps/gatherly-mobile/components/AppHeader.tsx`. TypeScript compiles: `cd apps/gatherly-mobile && npx tsc --noEmit --pretty 2>&1 | head -30`
  </verify>
  <done>AppHeader component exists with title, subtitle, onBack, rightAction, and rightElement props. Uses inline styles matching event-details.tsx header exactly.</done>
</task>

<task type="auto">
  <name>Task 2: Replace all inline headers with AppHeader</name>
  <files>
    apps/gatherly-mobile/app/event-details.tsx
    apps/gatherly-mobile/app/edit-event.tsx
    apps/gatherly-mobile/app/edit-event-details.tsx
    apps/gatherly-mobile/app/edit-wishlist-item.tsx
    apps/gatherly-mobile/app/my-wishlist.tsx
    apps/gatherly-mobile/app/view-wishlists.tsx
    apps/gatherly-mobile/app/modules-config.tsx
    apps/gatherly-mobile/app/polls.tsx
    apps/gatherly-mobile/app/rsvp.tsx
    apps/gatherly-mobile/app/manage-exclusions.tsx
  </files>
  <action>
Replace the inline header blocks in each screen with `<AppHeader ... />`. Import from `@/components/AppHeader`.

**For each screen, map the current header to AppHeader props:**

1. **event-details.tsx** (lines ~264-321):
   - `title={event.name}`, `subtitle={dateLocationLine || undefined}`, `onBack={() => router.back()}`
   - `rightElement` = the dateBadge View (the colored pill with UPCOMING/TODAY/PAST)
   - Remove the entire header View block (lines ~264-321) and replace with AppHeader + dateBadge as rightElement.
   - Remove `ArrowLeft` from lucide imports if no longer used elsewhere in the file.

2. **edit-event.tsx** (lines ~349-361):
   - `title="Manage Event"`, `onBack={() => router.back()}`
   - No right action (currently a spacer). Just omit rightAction.

3. **edit-event-details.tsx** (lines ~153-165):
   - `title="Edit Event"`, `onBack={() => router.back()}`
   - No right action.

4. **edit-wishlist-item.tsx** (lines ~159-185):
   - `title="Edit Item"`, `onBack={() => router.back()}`
   - `rightAction={{ label: "Save", onPress: handleSave, disabled: isSaving, loading: isSaving }}`

5. **my-wishlist.tsx** (lines ~218-234):
   - `title="My Wishlist"`, `subtitle={event.name}`, `onBack={() => router.back()}`
   - No right action.

6. **view-wishlists.tsx** (lines ~383-399):
   - `title="Wishlists"`, `subtitle={event.name}`, `onBack={() => router.back()}`
   - No right action.

7. **modules-config.tsx** (lines ~200-211):
   - `title="Customize Your Event"`, `onBack={() => router.back()}`
   - No right action.

8. **polls.tsx** (lines ~135-155):
   - `title="Polls"`, `onBack={() => router.back()}`
   - `rightAction` only when `isOrganizer`: `{ icon: <Plus size={20} color="white" />, onPress: () => setShowCreateModal(true), style: { backgroundColor: "#0d9488" } }`
   - When not organizer, omit rightAction (spacer auto-rendered).

9. **rsvp.tsx** — has TWO headers (organizer view line ~81, participant view line ~196):
   - Organizer: `title="RSVP Responses"`, `onBack={() => router.back()}`
   - Participant: `title="RSVP"`, `onBack={() => router.back()}`
   - Neither has right action.

10. **manage-exclusions.tsx** (lines ~99-112):
    - `title="Manage Exclusions"`, `onBack={handleSave}` (note: back triggers save here)
    - No right action.

**Style migration notes:**
- All screens currently using NativeWind classes on their headers will switch to the AppHeader inline-style pattern. This is intentional — we are standardizing on the event-details.tsx look.
- If a screen uses `SafeAreaView edges={["bottom"]}` (no "top"), add `"top"` to the edges array so the AppHeader sits below the status bar correctly. Screens to update: edit-event.tsx, edit-event-details.tsx, edit-wishlist-item.tsx, my-wishlist.tsx, view-wishlists.tsx, modules-config.tsx, polls.tsx, rsvp.tsx (both returns), manage-exclusions.tsx. If the screen has no SafeAreaView wrapping at all (manage-exclusions.tsx uses bare View), wrap content in SafeAreaView with edges={["top"]}.
- Clean up unused ArrowLeft imports from each file (only if ArrowLeft is not used elsewhere in that file).
  </action>
  <verify>
TypeScript compiles: `cd apps/gatherly-mobile && npx tsc --noEmit --pretty 2>&1 | head -50`

Grep to confirm all screens import AppHeader:
`grep -r "AppHeader" apps/gatherly-mobile/app/ --include="*.tsx" -l`

Should list all 10 screen files.

Grep to confirm no old inline headers remain (spot check):
`grep -n "Header bar" apps/gatherly-mobile/app/*.tsx` — should return zero results.
  </verify>
  <done>All 10 screens use AppHeader. No inline header blocks remain. All screens have SafeAreaView with "top" edge for correct status bar spacing. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
1. `cd apps/gatherly-mobile && npx tsc --noEmit` — zero type errors
2. `grep -r "import.*AppHeader" apps/gatherly-mobile/app/ --include="*.tsx" | wc -l` — should be 10
3. `grep -n "Header bar\|Dedicated header bar" apps/gatherly-mobile/app/*.tsx` — should return nothing
4. Visual spot-check: headers should look identical to before (same colors, same layout, same functionality)
</verification>

<success_criteria>
- AppHeader component exists at `apps/gatherly-mobile/components/AppHeader.tsx`
- All 10 screens import and use AppHeader instead of inline header blocks
- TypeScript compiles with zero errors
- Each screen's header behavior is preserved (back navigation, right actions, titles, subtitles)
- All screens have proper SafeAreaView top edge handling
</success_criteria>

<output>
After completion, create `.planning/quick/004-modular-header-component/004-SUMMARY.md`
</output>
