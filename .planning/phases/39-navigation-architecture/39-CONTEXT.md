# Phase 39: Navigation Architecture - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the app's navigation so all primary features are reachable within 2 taps, sub-screens (edit-event-details, manage-exclusions) are consolidated into modal sheets, short single-purpose forms become modal sheets, and the tab bar behaves consistently across global and event contexts.

</domain>

<decisions>
## Implementation Decisions

### Sub-screen consolidation
- `edit-event-details` → full-height modal sheet opened from Edit Event (not inline, not a stack push)
- `manage-exclusions` → full-height modal sheet opened from Edit Event (same pattern)
- Both sheets: Save button to commit, swipe down to cancel/discard
- Full-height sheets (animate in from bottom, look nearly full-screen but still feel like sheets)

### 2-tap reachability
- Approach: event-contextual tabs — when inside an event, the tab bar switches to event-level tabs
- User flow: Events list (tap 1) → event card → event-details becomes the event hub with event-level tabs (tap 2 lands on the event hub, then tabs are free navigation)
- Note: wishlists are part of the gift exchange module, not a standalone tab
- Claude's discretion: define the specific event tab layout (e.g., Details, Gift Exchange, Potluck, etc.) based on active modules

### Modal sheet scope
- `edit-wishlist-item` → modal sheet (single-purpose: add/edit one wishlist item)
- Rule: single-purpose forms (one item/one setting) = modal sheet; multi-purpose screens stay full-screen
- `polls`, `rsvp`, `potluck-setup`, `potluck`, `modules-config`, `edit-event` → remain full-screen stacks (too much content or multi-purpose)
- `checkout`, `payment-success` → remain full-screen stacks (payment flows are intentionally weighty)

### Tab bar visibility
- Two tab contexts: global tabs (Events, Profile) and event-level tabs
- When entering an event, event-level tabs replace the global tab bar entirely
- Global tabs reappear when the user exits the event context (back to Events list)
- Event-level tab bar stays visible even on task screens within the event (edit-event, modules-config, potluck-setup) — tab bar persists throughout the event context
- Global tab bar hidden on: all screens once inside an event, onboarding, checkout, payment-success

### Claude's Discretion
- Specific event tab structure (which tabs, their order, how dynamic/active-module-based tabs work)
- Exact animation and gesture behavior for full-height modal sheets
- How back navigation works when event tabs are active vs global tabs

</decisions>

<specifics>
## Specific Ideas

- Wishlists are part of the gift exchange module — they are not a top-level tab or standalone feature
- Event-contextual tabs: entering an event swaps the tab bar completely, exiting restores the global tab bar
- The 2-tap guarantee: tap 1 = select event from list, tap 2 = you are inside the event hub with all module tabs immediately available

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 39-navigation-architecture*
*Context gathered: 2026-04-09*
