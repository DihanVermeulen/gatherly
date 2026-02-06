# Requirements: Gatherly v2.0

**Defined:** 2026-02-06
**Core Value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

## v2.0 Requirements

Requirements for v2.0 milestone. Each maps to roadmap phases.

### Wishlist Management

- [ ] **WISH-01**: User can create wishlist items with name, description, and image
- [ ] **WISH-02**: User can set priority level on wishlist items (high/medium/low)
- [ ] **WISH-03**: User can edit their own wishlist items
- [ ] **WISH-04**: User can delete their own wishlist items
- [ ] **WISH-05**: User can add product URL links to wishlist items
- [ ] **WISH-06**: User can reorder wishlist items via drag-and-drop
- [ ] **WISH-07**: Participants can view other participants' wishlists

### Gift Claiming

- [ ] **CLAIM-01**: Participant can anonymously claim a gift from another participant's wishlist
- [ ] **CLAIM-02**: Participant can unclaim a gift if plans change
- [ ] **CLAIM-03**: System prevents duplicate claims with race condition protection
- [ ] **CLAIM-04**: Claimed status is visible only to the claimer, not the wishlist owner

### Invite System

- [ ] **INV-01**: Organizer can generate shareable invite links for events
- [ ] **INV-02**: Organizer can generate QR codes for event invites
- [ ] **INV-03**: Participants can join events via invite link or QR code

### Mobile UI Redesign

- [ ] **UI-01**: App uses mobile-first iOS-style interface components
- [ ] **UI-02**: App has bottom navigation bar for primary actions
- [ ] **UI-03**: Events display as visual cards with status indicators
- [ ] **UI-04**: Layouts are optimized for thumb-zone interaction
- [ ] **UI-05**: App uses Plus Jakarta Sans font throughout
- [ ] **UI-06**: App uses Material Symbols icons
- [ ] **UI-07**: App maintains dark mode support across all new screens

### Technical Requirements

- [ ] **TECH-01**: Tailwind CSS upgraded from v2 to v3.4.19+
- [ ] **TECH-02**: Konsta UI v5.0.0 integrated for iOS-style components
- [ ] **TECH-03**: Database schema includes wishlists table with proper indexes
- [ ] **TECH-04**: Database schema includes invites table for tracking
- [ ] **TECH-05**: Gift claiming uses atomic database operations (INSERT ON CONFLICT)
- [ ] **TECH-06**: Image uploads are compressed before storage (max 800px width, 80% quality)
- [ ] **TECH-07**: Wishlist data extends EventsContext with backward compatibility

## Future Requirements (v2.1+)

Deferred to future release. Tracked but not in current roadmap.

### Email & Notifications

- **EMAIL-01**: Organizer can send email invites to participants
- **EMAIL-02**: Organizer can view invite status (pending/joined/declined)
- **EMAIL-03**: Organizer can resend invites to pending participants
- **EMAIL-04**: Participants receive email reminders for wishlist creation deadlines
- **EMAIL-05**: Participants receive email notifications when assignments are made

### Advanced Wishlist Features

- **WISH-08**: User can add multiple images per wishlist item
- **WISH-09**: User can mark wishlist items as "purchased elsewhere" (not available for claiming)
- **WISH-10**: System suggests similar items when wishlist is too small for gift count

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mandatory user accounts | Reduces friction for participants, localStorage fallback allows offline use |
| Email notification spam | 2026 Gmail crisis shows users hate email overload, keep minimal |
| Price tracking / deal alerts | Scope creep into price comparison, out of core value |
| AI gift suggestions | Users distrust AI in intimate gift contexts per research |
| In-app purchasing | Payment compliance nightmare, gifts purchased externally |
| Real-time updates (WebSocket) | Polling/refresh sufficient for v2.0, adds complexity |
| Multiple events per participant | Single event focus simplifies UX for v2.0 |
| Gift reveal animations | Polish feature, defer until core features validated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WISH-01 | Phase 2 | Pending |
| WISH-02 | Phase 2 | Pending |
| WISH-03 | Phase 2 | Pending |
| WISH-04 | Phase 2 | Pending |
| WISH-05 | Phase 2 | Pending |
| WISH-06 | Phase 6 | Pending |
| WISH-07 | Phase 2 | Pending |
| CLAIM-01 | Phase 3 | Pending |
| CLAIM-02 | Phase 3 | Pending |
| CLAIM-03 | Phase 3 | Pending |
| CLAIM-04 | Phase 3 | Pending |
| INV-01 | Phase 4 | Pending |
| INV-02 | Phase 4 | Pending |
| INV-03 | Phase 4 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 5 | Pending |
| UI-06 | Phase 5 | Pending |
| UI-07 | Phase 5 | Pending |
| TECH-01 | Phase 1 | Pending |
| TECH-02 | Phase 1 | Pending |
| TECH-03 | Phase 1 | Pending |
| TECH-04 | Phase 1 | Pending |
| TECH-05 | Phase 1 | Pending |
| TECH-06 | Phase 6 | Pending |
| TECH-07 | Phase 1 | Pending |

**Coverage:**
- v2.0 requirements: 28 total
- Mapped to phases: 28 (100% coverage)
- Unmapped: 0

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
