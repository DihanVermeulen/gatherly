# Phase 14: Edit Event Screen - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Organizers configure an event from the Edit screen — managing participants via invite links, defining couple exclusion rules, setting gift counts, generating secret code assignments, and viewing/copying the generated codes. Screen must match Edit.png template. The Edit.png template fully defines the visual layout; this context captures interaction decisions.

</domain>

<decisions>
## Implementation Decisions

### Add Participant flow
- Tapping "+ Add Participant" opens a **modal** (not inline input, not navigation)
- Modal generates an invite link immediately when opened (calls the invites API)
- Modal displays: **QR code** + **copyable invite link** + **email option** + **native share sheet** (Expo Share API)
- Pattern mirrors `apps/gatherly/src/pages/events/invites.tsx` — same modal as the web app's QR share modal
- No email input before generating; modal opens with invite already created

### Manage Exclusions screen
- "Manage Exclusions" row (with chevron) pushes to a **separate screen** via Expo Router
- On the Exclusions screen, organizer **taps participants** to select a pair (tap Person A, then Person B) — no dropdowns
- Couple list displays existing pairs with a delete/remove action per pair
- **Partner Exclusions toggle** (on Edit screen): ON = couples CAN buy for each other; OFF = couples are excluded from buying for each other
- Logic already exists in `apps/gatherly/src/pages/events/edit.tsx` — replicate the `selectedCouples` + `coupleCrossing` pattern

### Generate & regenerate behavior
- Once generated, the participant list is **locked** — organizer cannot regenerate (no re-generate after first generation)
- Generate button shows a **loading spinner** while the API call is in progress
- If generation fails (impossible constraints), an **inline error message** appears below the Generate button
- Post-generation reveal: Claude's discretion — Secret Access Codes section appears on the same screen

### Secret code display
- Codes are **hidden by default** on load (masked, e.g., ••••••••)
- Eye icon per row **reveals** that participant's individual code
- Copy icon copies **the code itself only** (e.g., `XJ-992-K`) — not a URL
- No tap-row share action — eye + copy is sufficient

### Claude's Discretion
- Post-generation reveal animation/transition for the Secret Access Codes section
- Exact masking character for hidden codes
- Loading skeleton or loading state for the Edit screen on initial load
- Error state handling for failed API calls (outside generation errors)

</decisions>

<specifics>
## Specific Ideas

- "Add Participant should work like the web app's invite modal" — QR code, invite link, email option, native share sheet in one modal
- The invite/couple logic is already implemented in the web app (`apps/gatherly/src/pages/events/edit.tsx`, `apps/gatherly/src/pages/events/invites.tsx`) — port the logic, don't reinvent it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-edit-event-screen*
*Context gathered: 2026-02-24*
