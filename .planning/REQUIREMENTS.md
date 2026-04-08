# Requirements: Gatherly v2.4 Navigation & UX Overhaul

**Defined:** 2026-04-08
**Core Value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

---

## v1 Requirements (This Milestone)

### Navigation (NAV)

- [ ] **NAV-01**: All primary features are reachable in ≤ 2 taps from the tab bar or event details — no action buried more than 2 levels deep
- [ ] **NAV-02**: Edit Event sub-screens (`edit-event-details`, `manage-exclusions`) are consolidated — either merged into the Edit Event screen or surfaced as modals rather than full stack pushes
- [ ] **NAV-03**: Short forms and single-field edits use modal presentation instead of full-screen navigation stack pushes
- [ ] **NAV-04**: Tab bar is consistently visible on all primary tab screens; non-tab screens (event details, edit event, etc.) hide the tab bar without breaking back navigation

### Open Join Flow (JOIN)

- [ ] **JOIN-01**: Organizer can generate and share an open join link (URL + QR code) that anyone can use to join the event — no per-participant invite required
- [ ] **JOIN-02**: User opening a join link sees an event preview screen then is prompted to enter their name — same name-entry UX as the magic link flow (unified experience)
- [ ] **JOIN-03**: After entering their name and joining, user sees a modal offering to create an account for easier future re-entry
- [ ] **JOIN-04**: User who declines account creation is stored as a local participant session (SecureStore) and enters the event immediately
- [ ] **JOIN-05**: User with an existing account who opens a join link is auto-identified via their session and linked to their account (no duplicate participant record created)

### Magic Link Improvements (MAGIC)

- [ ] **MAGIC-01**: When a guest participant (joined without an account) later registers with the same email used in a magic link invite, their prior participation records are correctly linked to the new account — no orphaned or duplicate participant entries
- [ ] **MAGIC-02**: Organizer sending a magic link to an email address that already has a participant record in the event re-uses the existing record rather than creating a duplicate

### UI Uniformity (UNIFORM)

- [ ] **UNIFORM-01**: All screen-level text rendering uses GlueStack `Text` or `Heading` components from `components/ui/` — no direct `react-native` `Text` imports on screen files
- [ ] **UNIFORM-02**: All interactive/pressable elements use GlueStack `Pressable` or `Button` from `components/ui/` — no `TouchableOpacity` from `react-native` on screen files
- [ ] **UNIFORM-03**: All text input fields use GlueStack `Input`/`InputField` from `components/ui/` — no raw `TextInput` from `react-native` on screen files
- [ ] **UNIFORM-04**: Icons use `lucide-react-native` exclusively — no mixed icon libraries on any screen

### UX Simplification (UX)

- [ ] **UX-01**: Edit Event screen is redesigned as a single scrollable surface — basic details, participant list, module toggles, and assignment actions accessible without navigating to sub-screens
- [ ] **UX-02**: Module Config screen communicates module state (active / inactive / premium-locked / coming-soon) clearly through visual hierarchy — a first-time user understands what each toggle does without explanation
- [ ] **UX-03**: Event Details screen presents information in a clear hierarchy (event header → key participant actions → modules) with reduced information density so the most important action is always obvious

---

## Future Requirements (v2.5+)

### Billing

- **BILLING-01**: Stripe per-event payment flow — real card processing, webhook to set `plan_tier = 'premium'`
- **BILLING-02**: Payment history screen — organizer sees which events have been upgraded and when
- **BILLING-03**: Receipt/invoice delivery — email confirmation on upgrade
- **BILLING-04**: Replace `UPGRADE_REQUEST_URL` Typeform placeholder with real Stripe checkout

### Photo Gallery

- **GALLERY-01**: Photo gallery module — upload, view, 10-photo free limit
- **GALLERY-02**: Photo gallery paywall — "X of 10 photos · Upgrade for unlimited" counter + PaywallBanner

### Housekeeping

- **HOUSE-01**: Fix `/pricing` screen navigation orphan — add in-app surface to reach it
- **HOUSE-02**: Replace `assetlinks.json` SHA-256 fingerprint + `associatedDomains` placeholders before production

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time updates (WebSocket) | Adds complexity; polling/refresh is sufficient |
| Payment integration for gift purchases | Gift purchasing happens externally |
| Chat/messaging | Communication happens outside the app |
| Social features (followers, feeds) | Focused on gift exchange events only |
| Multi-language support | English-only for now |
| Image compression | Deferred to future milestone |
| Web app feature changes | `apps/gatherly` is maintained as-is; all new feature work goes into gatherly-mobile |
| Stripe billing | Deferred to v2.5 |
| Photo gallery module | Deferred to v2.5 with billing |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 39 | Pending |
| NAV-02 | Phase 39 | Pending |
| NAV-03 | Phase 39 | Pending |
| NAV-04 | Phase 39 | Pending |
| UX-01 | Phase 40 | Pending |
| UX-02 | Phase 40 | Pending |
| UX-03 | Phase 40 | Pending |
| UNIFORM-01 | Phase 41 | Pending |
| UNIFORM-02 | Phase 41 | Pending |
| UNIFORM-03 | Phase 41 | Pending |
| UNIFORM-04 | Phase 41 | Pending |
| JOIN-01 | Phase 42 | Pending |
| JOIN-02 | Phase 42 | Pending |
| JOIN-03 | Phase 42 | Pending |
| JOIN-04 | Phase 42 | Pending |
| JOIN-05 | Phase 42 | Pending |
| MAGIC-01 | Phase 43 | Pending |
| MAGIC-02 | Phase 43 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 — traceability filled after roadmap creation*
