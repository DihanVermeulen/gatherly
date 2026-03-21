# Phase 32: Screen Redesigns - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign three existing mobile screens — Event Details (Hub), Manage Event, and Module Config — to match the new design templates. Adds cover photo hero, location display, module cards with category grouping, and global settings toggles. New capabilities (Photo Gallery implementation, Expense Splitter) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Cover photo hero (Event Details screen)
- Full-bleed hero: photo extends edge-to-edge and behind the back arrow, with event name + date/location overlaid on top
- Fallback when no cover photo set: teal-to-dark gradient in the same hero slot (same layout, no photo)
- Date-based badge only: show UPCOMING / PAST / TODAY based on event date — skip FEATURED badge
- "Organized by [name]" line shown below the hero, sourced from the organizer's user profile name field

### Module cards on Event Hub
- Show ALL modules including unimplemented ones (Photo Gallery) — displayed as locked/greyed out
- Category group headers retained: ACTIVITY, COLLABORATION, MEMORIES labels above each group
- Gift Exchange status line: shows assignment status — "Assignments generated" or "Setup needed"
- Tapping a module card navigates into the module's content screen (Gift Exchange → wishlists, Potluck → potluck list)

### Manage Event editing flow
- Compact Event Details card shows thumbnail + name + date + location with an edit pencil icon
- Tapping the pencil navigates to a separate edit sub-screen (not inline expand) — full fields: name, date, location, cover photo
- Cover photo picker lives on the edit sub-screen (not tap-thumbnail-to-pick from Manage Event directly)
- Location: plain text input field — user types any string; stored as-is in the existing location column
- Module settings gear icon navigates to module-specific settings (not the global Module Config screen)

### Module Config — module list and behavior
- Gift Exchange is NO LONGER auto-inserted on event create — remove that behavior in this phase
- Gift Exchange appears in Module Config as a regular toggleable module (starts OFF by default for new events)
- Expense Splitter and Photo Gallery: shown in the list with a "Coming soon" badge, toggle disabled
- Save pattern: auto-save on toggle (no Save Modules button — each toggle fires the API immediately)
- Free-tier paywall: upgrade banner at the top of Module Config screen when event is on free tier

### Claude's Discretion
- Exact hero overlay gradient for legibility (text over photo)
- Exact height/proportions of the full-bleed hero
- Loading skeleton patterns for the redesigned screens
- Module-specific settings sheet design (appears tapped via gear icon)

</decisions>

<specifics>
## Specific Ideas

- Full-bleed hero should feel like the screen templates — photo behind the nav bar back arrow, event name as a bold overlay near the bottom of the hero
- The "Coming soon" badge approach signals the platform is growing without breaking the visual list

</specifics>

<deferred>
## Deferred Ideas

- FEATURED badge / is_featured organizer flag — could become an admin or premium feature in a later phase
- Maps/Places autocomplete for location field — noted as a future enhancement, plain text is sufficient for now
- Photo Gallery module implementation — this is a future phase; Phase 32 only shows it as "Coming soon"

</deferred>

---

*Phase: 32-screen-redesigns*
*Context gathered: 2026-03-21*
