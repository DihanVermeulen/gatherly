---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/gatherly/src/pages/events/details.tsx
autonomous: true

must_haves:
  truths:
    - "Clicking 'Add My Gifts' navigates to the wishlist page for the current user's participant"
    - "If the current user is not a participant in the event, the button is disabled or shows a message"
    - "'View All Gifts' button continues to navigate to /events/:id/gifts"
  artifacts:
    - path: "apps/gatherly/src/pages/events/details.tsx"
      provides: "Updated navigation for Add My Gifts button"
      contains: "wishlist"
  key_links:
    - from: "apps/gatherly/src/pages/events/details.tsx"
      to: "/events/:eventId/wishlist/:participantId"
      via: "navigate() call on Add My Gifts button"
      pattern: "navigate.*wishlist"
---

<objective>
Fix the "Add My Gifts" button in EventDetailsPage to navigate to the user's wishlist page instead of the general gifts page.

Purpose: Currently both bottom buttons navigate to `/events/${event.id}/gifts`. The "Add My Gifts" button should navigate to `/events/${event.id}/wishlist/${participantId}` where participantId is the current authenticated user's participant record for that event.

Output: Updated details.tsx with correct navigation.
</objective>

<execution_context>
@C:\Users\dihan\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\dihan\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/gatherly/src/pages/events/details.tsx
@apps/gatherly/src/routes.tsx
@apps/gatherly/src/contexts/AuthContext.tsx
@apps/gatherly/src/api/auth.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update "Add My Gifts" button to navigate to wishlist page</name>
  <files>apps/gatherly/src/pages/events/details.tsx</files>
  <action>
1. Import `useAuth` from `contexts/AuthContext` at the top of the file.

2. Inside the `EventDetailsPage` component, destructure `user` from `useAuth()`:
   ```typescript
   const { user } = useAuth();
   ```

3. Find the current user's participant ID by matching the auth user's name against `participantDetails`. Add this after the existing `participants` variable (around line 43):
   ```typescript
   const currentParticipant = event.participantDetails?.find(
     (p) => p.name === user?.name
   );
   ```

4. Update the "Add My Gifts" button's `onClick` handler (line 213) to navigate to the wishlist:
   - If `currentParticipant` exists: `navigate(`/events/${event.id}/wishlist/${currentParticipant.id}`)`
   - If `currentParticipant` does not exist: keep the button but disable it (add `disabled` attribute and reduce opacity with `opacity-50 cursor-not-allowed` classes)

5. The "View All Gifts" button (line 207) must remain unchanged, still navigating to `/events/${event.id}/gifts`.

Do NOT change any other navigation or component logic. This is a single-line navigation fix with a guard for missing participant.
  </action>
  <verify>
    - Run `pnpm check-types` from the repo root to confirm no TypeScript errors
    - Visually inspect the diff: only the "Add My Gifts" onClick should change, plus the new import and participant lookup
    - Confirm "View All Gifts" button onClick still points to `/events/${event.id}/gifts`
  </verify>
  <done>
    - "Add My Gifts" button navigates to `/events/{eventId}/wishlist/{participantId}` using the current user's participant ID
    - Button is disabled when user is not a participant in the event
    - "View All Gifts" button is unchanged
    - No TypeScript errors
  </done>
</task>

</tasks>

<verification>
- `pnpm check-types` passes with no errors
- In details.tsx, the "Add My Gifts" onClick references the wishlist route
- In details.tsx, the "View All Gifts" onClick still references the gifts route
</verification>

<success_criteria>
- Clicking "Add My Gifts" on the event details page navigates to the correct wishlist page for the authenticated user
- The feature gracefully handles the case where the user is not a participant
- No regressions to "View All Gifts" navigation
</success_criteria>

<output>
After completion, create `.planning/quick/001-add-my-gifts-navigate-to-wishlist/001-SUMMARY.md`
</output>
