---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/gatherly-mobile/app/event-details.tsx
autonomous: true

must_haves:
  truths:
    - "Back arrow sits in a dedicated white header bar above the hero banner, not overlaid on it"
    - "Header bar shows back arrow on the left, event name centered or left-aligned, with date/location subtitle"
    - "Hero banner image/gradient sits below the header, no longer has overlaid navigation"
  artifacts:
    - path: "apps/gatherly-mobile/app/event-details.tsx"
      provides: "Dedicated header matching Details.png template"
  key_links:
    - from: "Header back button"
      to: "router.back()"
      via: "onPress handler"
      pattern: "router\\.back"
---

<objective>
Refactor the event-details screen so the header matches the Details.png design template. Currently the back arrow floats over the hero banner image. The design shows a dedicated white header bar above the banner containing: a back arrow on the left, the event name, and the date/location subtitle line.

Purpose: Match the approved Details.png design template for visual consistency.
Output: Updated event-details.tsx with proper header layout.
</objective>

<execution_context>
@C:\Users\dihan\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\dihan\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/gatherly-mobile/screen-templates/Details.png
@apps/gatherly-mobile/app/event-details.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract header from hero and create dedicated header bar</name>
  <files>apps/gatherly-mobile/app/event-details.tsx</files>
  <action>
Restructure the top of the event-details screen to match Details.png:

1. **Add a dedicated header bar ABOVE the ScrollView** (not inside it, so it stays fixed):
   - White background, safe-area aware at the top (use `edges={["top"]}` on an outer SafeAreaView or add "top" to the existing edges array and restructure)
   - Height: ~56px content area
   - Left side: Back arrow button (ArrowLeft icon, teal color `#0d9488`, no circular background — just the icon, tappable area ~40x40)
   - Center/left-of-center: Event name (fontSize 17-18, fontWeight 700, color #0f172a, numberOfLines 1)
   - Below the name (still in the header): date/location subtitle line (fontSize 13, color #64748b)
   - The date badge (UPCOMING/TODAY/PAST) can move to the right side of the header bar

2. **Simplify the hero banner:**
   - Remove the back arrow from inside the hero (lines 295-310 currently)
   - Remove the event name + date overlay from the bottom of the hero (lines 332-341)
   - Remove the date badge from inside the hero (lines 313-329)
   - Keep the hero as a pure visual banner: just the cover photo or teal gradient
   - Reduce HERO_HEIGHT from 260 to ~180-200 since the hero no longer needs space for overlaid text
   - Keep the bottom scrim gradient but make it lighter or remove entirely since there's no text to protect

3. **SafeAreaView restructure:**
   - Current: `edges={["bottom"]}` — change to `edges={["top", "bottom"]}` so the header respects the top safe area
   - The header bar should sit between the safe area top inset and the scroll content
   - Structure should be: SafeAreaView(top+bottom) > [HeaderBar, ScrollView(hero + content)]

4. **Preserve all existing functionality:** module cards, organized-by line, countdown banner, wishlist progress, create account banner — none of that changes.
  </action>
  <verify>
Run the app on mobile/simulator and confirm:
- Back arrow is in a white header bar, NOT floating over the banner
- Event name and date appear in the header bar
- Hero banner shows just the image/gradient without any overlaid text or buttons
- All module cards, countdown, wishlist progress still render correctly
- Back button navigates back correctly
  </verify>
  <done>
Header bar matches Details.png template: back arrow in dedicated header, event name + subtitle in header, hero is purely visual below it.
  </done>
</task>

</tasks>

<verification>
- Visual comparison with Details.png shows matching header layout
- No functionality regression (all module taps, navigation, badges still work)
- Safe area insets respected on both iOS and Android
</verification>

<success_criteria>
- Back arrow is in its own white header bar, not overlaid on the banner
- Event name and date/location subtitle display in the header
- Hero banner is purely visual (cover photo or gradient, no overlaid controls)
- Layout matches the Details.png design template
</success_criteria>

<output>
After completion, create `.planning/quick/003-event-hub-header-match-details-png/003-SUMMARY.md`
</output>
