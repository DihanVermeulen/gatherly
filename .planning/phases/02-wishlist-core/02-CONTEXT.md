# Phase 2: Wishlist Core - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Participants create, edit, and view wishlist items with images, descriptions, product URLs, and priority levels within an event. This phase handles CRUD operations for personal wishlists and viewing others' wishlists in the registry. Claiming functionality is a separate phase (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Wishlist Item Creation Flow
- Bottom drawer slides up when user taps "Add" button
- Visual-first form field order: Image → Name → Description → URL → Priority
- Only name is required (image, description, URL, priority are optional)
- Drawer closes immediately after save (no success toast, item appears in carousel)

### Wishlist Viewing & Browsing
- **Design reference:** `apps/gatherly/docs/screen-templates/gift-registry.html`
- **Your Wishlist (personal):**
  - Horizontal scrollable carousel of 176px-wide cards
  - Each card: square image, name (truncated), priority badge, Edit button
  - "Add More" dashed placeholder card at end of carousel
  - Items ordered by most recently added first
  - Edit button on card opens edit mode (not whole card tappable)
- **Registry (others' wishlists):**
  - Vertical list grouped by participant (alphabetically by name)
  - Each item: horizontal card with 80px square thumbnail, name, description snippet, priority badge, claim button
  - Tapping card does nothing (claim button is only interactive element)
  - Claimed items show greyscale with "Claimed" badge

### Image Handling
- Three upload methods: camera capture, gallery picker, paste image URL
- Immediate preview only (no cropping or editing UI)
- Compression: max 800px width, 80% quality (show warning if original is very large)
- No-image placeholder: gift box icon (Lucide React icon, not Material Symbols)
- **Icon library:** Use Lucide React icons throughout (not Material Symbols)

### Edit & Delete Patterns
- Inline editing in carousel (Edit button on card)
- Inline edit UX: Claude's discretion (card expansion, drawer transition, etc.)
- Delete methods: both swipe-to-delete AND delete button in edit mode
- Delete claimed items: allow with warning dialog ("Someone claimed this. Delete anyway?")

### Claude's Discretion
- Exact inline edit transition/animation
- Loading skeleton design while fetching wishlists
- Error state handling (network failures, image upload errors)
- Empty state messaging when participant has no wishlist items
- Exact compression warning message and threshold

</decisions>

<specifics>
## Specific Ideas

- **Visual design:** Follow the exact card styles, spacing, colors from `gift-registry.html` template
- **Typography:** Plus Jakarta Sans font (already in design system)
- **Priority badges:** "HIGH PRIORITY" in uppercase, small text, primary green color
- **Carousel behavior:** Hide scrollbar, smooth scroll, cards have subtle shadows
- **Mobile-first:** All interactions optimized for thumb-zone, iOS-style feel
- **Dark mode:** Support both light/dark themes (already in Konsta config from Phase 1)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-wishlist-core*
*Context gathered: 2026-02-07*
