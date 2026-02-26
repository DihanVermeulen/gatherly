# Phase 15: My Wishlist Screen - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users manage their own personal wishlist for a specific event — viewing, adding, editing, and deleting items (name, description, image, priority). Browsing other participants' wishlists and gift claiming are Phase 16.

</domain>

<decisions>
## Implementation Decisions

### Item entry flow
- FAB / + button opens a bottom sheet for adding new items
- Bottom sheet includes all four fields: name, description, image, and priority
- After saving, the sheet closes and the new item appears at the top of the list
- Editing uses a separate full-screen edit screen (not the same bottom sheet)

### Item display
- Cards layout — rounded corners, slightly elevated (matching Events list style)
- If an item has an image, it appears as a full-width header at the top of the card
- Card body shows: item name + priority label
- Description is not visible on the card (only in the edit screen)
- Empty state: icon/illustration + message + prompt button to add first item

### Edit & delete interactions
- Long-press on a card opens an ActionSheet (slides up from bottom) with: Edit / Delete / Cancel
- Tapping Edit navigates to the full-screen edit screen (pre-filled)
- Tapping Delete shows a confirmation dialog before removing
- Delete is optimistic — item is removed immediately from the list; reverted if API call fails

### Priority display
- 3 levels: High / Medium / Low
- On the card: text label only, no color coding (e.g. "Low", "Medium", "High")
- In the add/edit form: segmented control (3 buttons side by side)
- Default priority when adding: Low

### Claude's Discretion
- Exact card dimensions, spacing, and typography
- Loading/saving states within the bottom sheet and edit screen
- Error toast/message design for failed API calls
- Image picker implementation (camera roll, camera, or both)

</decisions>

<specifics>
## Specific Ideas

- Priority text label appears on the card alongside the item name (not a colored badge — plain text)
- The add bottom sheet is the same pattern as other bottom sheets in the app (gorhom/bottom-sheet)
- Edit screen follows the same full-screen pattern as edit-event.tsx

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-my-wishlist-screen*
*Context gathered: 2026-02-26*
