# Requirements: Gatherly v2.1

**Defined:** 2026-02-22
**Core Value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

---

## v2.1 Requirements — Gatherly Mobile (React Native)

Port Gatherly to React Native (Expo + GlueStack) as the primary mobile client with full v2.0 feature parity plus organizer invite management.

### Navigation

- [ ] **NAV-01**: App launches directly to Events screen (no marketing landing page)
- [ ] **NAV-02**: App has persistent navigation (bottom tabs or equivalent) connecting main sections
- [ ] **NAV-03**: Unauthenticated user is redirected to Login screen
- [ ] **NAV-04**: Deep links from invite URLs open the Join Event screen

### Authentication

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User can register with name, email, and password
- [ ] **AUTH-03**: Session persists via JWT auto-refresh (access token in-memory, refresh via HttpOnly cookie)
- [ ] **AUTH-04**: User can log out and is returned to Login screen

### Events

- [ ] **EVNT-01**: User can view a list of all their events showing name, status, participant count, and gift count
- [ ] **EVNT-02**: User can create a new event with a name
- [ ] **EVNT-03**: User can delete an event
- [ ] **EVNT-04**: User can view event details including their secret assignment (inline reveal, no codes)
- [ ] **EVNT-05**: User can add participants to an event by name
- [ ] **EVNT-06**: User can remove participants from an event
- [ ] **EVNT-07**: User can define couples who should not buy for each other
- [ ] **EVNT-08**: User can set the number of gifts per person and generate secret assignments
- [ ] **EVNT-09**: Organizer can view generated secret codes per participant

### Wishlists

- [ ] **WISH-01**: User can view their own wishlist for an event
- [ ] **WISH-02**: User can add a wishlist item with name, description, image, and priority
- [ ] **WISH-03**: User can edit and delete their own wishlist items
- [ ] **WISH-04**: User can browse all participants' wishlists in an event
- [ ] **WISH-05**: User can claim a gift from another participant's wishlist (anonymous to wishlist owner)
- [ ] **WISH-06**: User can unclaim a gift they previously claimed
- [ ] **WISH-07**: Claimed status is hidden from the wishlist owner (privacy preserved)

### Invites

- [ ] **INVT-01**: User can join an event via invite link (deep link opens Join Event screen)
- [ ] **INVT-02**: Join flow handles all states: loading, event preview, join form, success, already joined, error
- [ ] **INVT-03**: Organizer can view all sent invites for an event with their status
- [ ] **INVT-04**: Organizer can resend a magic link invite to a participant
- [ ] **INVT-05**: Organizer can revoke a pending invite

### Screen Templates

- [ ] **TMPL-01**: Each screen is implemented to match its PNG template in `screen-templates/`
- [ ] **TMPL-02**: If a screen template is missing, ask user to create it before implementing that screen
- [ ] **TMPL-03**: All UI uses components from `components/ui/` (GlueStack); no custom UI primitives

---

## Future Requirements

Not in v2.1 scope — tracked for later.

### Performance

- **PERF-01**: Image uploads compressed before storage (max 800px width, 80% quality)
- **PERF-02**: Wishlist images lazy-loaded on scroll

### Polish

- **POLSH-01**: Drag-to-reorder wishlist items on mobile
- **POLSH-02**: QR code display for invite sharing in mobile app
- **POLSH-03**: Offline mutation queue with visible sync indicator (like web app)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web app changes (apps/gatherly) | Web app maintained as-is; all new work in gatherly-mobile |
| Decipher page (legacy code entry) | Legacy path for printed codes; not needed in native mobile flow |
| New backend API features | Same API as web app; no new endpoints except organizer invite management if missing |
| Real-time updates (WebSocket) | Polling/refresh sufficient; complexity not justified |
| Social features | Outside gift exchange scope |
| Multi-language support | English-only for now |
| Image compression | Not selected for v2.1; deferred to future |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 11 | Complete |
| NAV-02 | Phase 11 | Complete |
| NAV-03 | Phase 11 | Complete |
| NAV-04 | Phase 11 | Complete |
| AUTH-01 | Phase 12 | Pending |
| AUTH-02 | Phase 12 | Pending |
| AUTH-03 | Phase 12 | Pending |
| AUTH-04 | Phase 12 | Pending |
| EVNT-01 | Phase 13 | Pending |
| EVNT-02 | Phase 13 | Pending |
| EVNT-03 | Phase 13 | Pending |
| EVNT-04 | Phase 13 | Pending |
| EVNT-05 | Phase 14 | Pending |
| EVNT-06 | Phase 14 | Pending |
| EVNT-07 | Phase 14 | Pending |
| EVNT-08 | Phase 14 | Pending |
| EVNT-09 | Phase 14 | Pending |
| WISH-01 | Phase 15 | Pending |
| WISH-02 | Phase 15 | Pending |
| WISH-03 | Phase 15 | Pending |
| WISH-04 | Phase 16 | Pending |
| WISH-05 | Phase 16 | Pending |
| WISH-06 | Phase 16 | Pending |
| WISH-07 | Phase 16 | Pending |
| INVT-01 | Phase 17 | Pending |
| INVT-02 | Phase 17 | Pending |
| INVT-03 | Phase 18 | Pending |
| INVT-04 | Phase 18 | Pending |
| INVT-05 | Phase 18 | Pending |
| TMPL-01 | All phases (11–18) | Pending |
| TMPL-02 | All phases (11–18) | Pending |
| TMPL-03 | All phases (11–18) | Pending |

**Coverage:**
- v2.1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 — traceability updated after v2.1 roadmap creation*
