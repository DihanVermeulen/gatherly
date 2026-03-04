# Phase 16: Event Wishlists + Claiming - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users browse all participants' wishlists within a specific event and claim or unclaim gifts anonymously. Claimed status is visible to everyone except the item owner, who only sees that an item was claimed (not by whom). Creating and editing wishlist items (CRUD) is Phase 15 — this phase is browse + claim only.

</domain>

<decisions>
## Implementation Decisions

### Participant browsing layout
- Vertical sections — one scrollable list; each participant has a named section header, their items listed below
- Sections with zero wishlist items are hidden entirely (only participants with items appear)
- Item cards show: item name + image thumbnail + priority
- Your own section appears first, labeled "My Wishlist", visually distinguished from others
- Other participants' sections are ordered alphabetically below yours

### Claim interaction design
- Long-press on a card opens an ActionSheet
- If item is unclaimed: ActionSheet shows "Claim" + "Cancel"
- If item is claimed by you: ActionSheet shows "Unclaim" + "Cancel"
- If item is claimed by someone else: long-press does nothing (no ActionSheet)
- Claimed items appear grayed out with a "Claimed" label — visually de-emphasized
- After claim or unclaim: brief toast confirmation, stay on screen, item updates optimistically

### Own wishlist privacy
- Your own items (in "My Wishlist" section) show name + image + priority — no claim UI at all
- Long-press your own items → ActionSheet with Edit / Delete / Cancel (same as Phase 15)
- You CAN see which of your own items are claimed, but not who claimed them
- Claimed own-items show a subtle indicator (badge/icon) — card stays full opacity (not grayed out)
- You cannot claim your own items

### Navigation & entry point
- Entry: "View Wishlists" button on Event Details screen navigates here
- Screen header: "Wishlists" as title, event name as subtitle
- No dedicated bottom nav tab — accessed through Event Details only

### Claude's Discretion
- Exact card dimensions, spacing, and visual treatment for sections
- Toast design and duration
- Loading state while fetching all participants' wishlists
- Empty state if no participants have any items
- Visual distinction style for "My Wishlist" section vs others

</decisions>

<specifics>
## Specific Ideas

- Same long-press → ActionSheet pattern as Phase 15 (Edit/Delete) — consistent interaction model
- "My Wishlist" section at top mirrors natural mental model: "my stuff first, then others"
- Subtle claimed indicator on own items (badge/icon, full opacity) contrasts with others' claimed items (grayed out) — owner sees claimed state differently from claimers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-event-wishlists-claiming*
*Context gathered: 2026-03-04*
