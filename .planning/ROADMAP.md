# Roadmap: Gatherly

## Milestones

- ✅ **v2.0 Gift Exchange Platform** - Phases 1–10 (shipped 2026-02-22)
- 🚧 **v2.1 Gatherly Mobile** - Phases 11–19 (in progress)

## Phases

<details>
<summary>✅ v2.0 Gift Exchange Platform (Phases 1–10) - SHIPPED 2026-02-22</summary>

See `.planning/milestones/v2.0-ROADMAP.md` for full phase details.

**Summary:** Wishlist system, anonymous claiming, JWT auth, offline-first sync, magic link invites, inline assignment reveal — shipped across 10 phases and 27 plans.

</details>

---

### 🚧 v2.1 Gatherly Mobile (In Progress)

**Milestone Goal:** Port Gatherly to React Native (Expo 54 + GlueStack UI v3 + Expo Router 6) as the primary mobile client with full v2.0 feature parity plus organizer invite management. Every screen matches its PNG template in `screen-templates/`.

---

### ✅ Phase 11: Navigation Foundation — COMPLETE 2026-02-23

**Goal**: The app has a working navigation shell — authenticated users land on Events, unauthenticated users are redirected to Login, deep links open Join Event, and all main sections are reachable from persistent navigation
**Depends on**: Nothing (first phase of v2.1 — existing scaffolding in place)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Note**: TMPL-01, TMPL-02, TMPL-03 apply to all screens implemented in this and every subsequent phase.
**Success Criteria** (what must be TRUE):
  1. Launching the app on an unauthenticated device goes directly to the Login screen (no landing page)
  2. After logging in, the user lands on the Events screen with no manual navigation required
  3. Tapping any item in the bottom navigation bar reaches its destination screen
  4. Pasting a gatherly invite URL into the device opens the app and shows the Join Event screen
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — File structure restructure: delete broken tabs/, create app/(tabs)/, stub AuthContext, sign-in, join, update app.json scheme
- [x] 11-02-PLAN.md — Root layout auth guard (Stack.Protected), full bottom tab navigator with lucide icons, human verification checkpoint

---

### Phase 12: Authentication Screens

**Goal**: Users can create accounts, log in, and log out — with sessions that survive app restarts via JWT auto-refresh
**Depends on**: Phase 11
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. Login and Register screen templates are NOW PROVIDED (Login.png and Register.png exist — note filenames are swapped: Register.png = Login UI, Login.png = Register UI).
**Success Criteria** (what must be TRUE):
  1. User enters email and password on the Login screen and reaches the Events screen on success
  2. User fills name, email, and password on the Register screen and is logged in immediately after
  3. Closing and reopening the app keeps the user logged in (session restored via token refresh)
  4. Tapping "Log out" from any screen returns the user to the Login screen with session cleared
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md — Login screen (matching Register.png) + AuthContext upgrade with expo-secure-store + client.ts interceptor fix
- [ ] 12-02-PLAN.md — Register screen (matching Login.png) + backend refresh endpoint body fallback

---

### ✅ Phase 13: Events List + Details Screens — COMPLETE 2026-02-24

**Goal**: Users can see all their events at a glance and view event details including their secret assignment — both screens matching their PNG templates
**Depends on**: Phase 12
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. Events.png and Details.png templates exist. Partially-done Events list screen (index.tsx) must be completed to match Events.png.
**Success Criteria** (what must be TRUE):
  1. Events screen shows a list of all events with name, participant count, and gift count per event
  2. User can create a new event from the Events screen and see it appear in the list immediately
  3. User can delete an event from the Events screen
  4. Tapping an event opens the Details screen showing participants and the user's secret assignment (inline reveal, no codes)
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — Mount EventsProvider, fix bugs (delete/navigation/search), rework Events list to match Events.png, fix CreateEvent API call
- [ ] 13-02-PLAN.md — Event Details screen matching Details.png (participant list, inline assignment reveal, stubbed gift buttons)

---

### ✅ Phase 14: Edit Event Screen — COMPLETE 2026-02-25

**Goal**: Organizers can fully configure an event — adding/removing participants, defining couples, setting gift counts, generating assignments, and viewing secret codes — all from the Edit screen matching Edit.png
**Depends on**: Phase 13
**Requirements**: EVNT-05, EVNT-06, EVNT-07, EVNT-08, EVNT-09
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. Edit.png template exists. Partially-done edit-event.tsx must be completed to match Edit.png.
**Success Criteria** (what must be TRUE):
  1. Organizer can tap "+ Add Participant", generate an invite link/QR code, and share it with the new participant
  2. Organizer can remove a participant and they are gone from the list
  3. Organizer can mark two participants as a couple and the constraint is saved
  4. Organizer sets gifts-per-person, taps Generate, and assignments appear without page reload
  5. Organizer can view the secret code for each participant after assignments are generated
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Install react-qr-code, create invites API module, Manage Exclusions screen + route registration
- [x] 14-02-PLAN.md — Complete edit-event.tsx overhaul: participant chips, invite modal, settings, generate, secret codes

---

### Phase 15: My Wishlist Screen

**Goal**: Users can manage their own wishlist for an event — adding, editing, and deleting items with name, description, image, and priority
**Depends on**: Phase 13
**Requirements**: WISH-01, WISH-02, WISH-03
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. My Wishlist screen template has been provided via discuss-phase (CONTEXT.md), which contains detailed UI decisions.
**Success Criteria** (what must be TRUE):
  1. User opens My Wishlist for an event and sees all their existing wishlist items
  2. User adds a new item with name, description, optional image, and priority — it appears in the list
  3. User edits an existing item and sees the updated details reflected immediately
  4. User deletes an item and it is removed from the list
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md — Install expo-image-picker, register routes, create my-wishlist screen (list + FAB + add bottom sheet + ActionSheet delete)
- [ ] 15-02-PLAN.md — Full-screen edit-wishlist-item screen (pre-filled form, save with UPDATE_WISHLIST_ITEM)

---

### Phase 16: Event Wishlists + Claiming

**Goal**: Users can browse all participants' wishlists in an event and claim or unclaim gifts — with claimed status hidden from the wishlist owner
**Depends on**: Phase 15
**Requirements**: WISH-04, WISH-05, WISH-06, WISH-07
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. Event Wishlists screen template is MISSING — request template from user before implementing.
**Success Criteria** (what must be TRUE):
  1. User opens Event Wishlists and sees all participants' names with their wishlist items
  2. User taps "Claim" on someone else's item and the item shows as claimed to other viewers
  3. User taps "Unclaim" on an item they previously claimed — it returns to available status
  4. A user viewing their own wishlist does not see any claimed/unclaimed indicators (privacy preserved)
**Plans**: 2 plans

Plans:
- [ ] 16-01-PLAN.md — Request Wishlists screen template + build claim/unclaim data layer (type, API, reducer)
- [ ] 16-02-PLAN.md — Create view-wishlists.tsx screen (SectionList + claim/unclaim + privacy) + wire navigation

---

### ✅ Phase 17: Join Event Screen — COMPLETE 2026-02-27

**Goal**: Users can join an event via an invite deep link — the Join Event screen handles all states of the flow gracefully
**Depends on**: Phase 12
**Requirements**: INVT-01, INVT-02
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. UI decisions provided via discuss-phase (CONTEXT.md) — full-screen hero layout, skeleton loading, 7 flow states.
**Success Criteria** (what must be TRUE):
  1. Tapping an invite link opens the app and shows an event preview with the event name and organizer
  2. User taps Join and is added to the event as a participant
  3. A user who is already a member of the event sees an "already joined" state (not a duplicate join)
  4. Invalid or expired invite codes show a clear error state — the user is not left on a blank screen
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — Add validate/accept to invitesApi, create pendingInvite utility, update _layout.tsx gesture
- [x] 17-02-PLAN.md — Full join.tsx screen (7 states: loading, preview, joining, success, already-joined, invalid, error) + auth screen auto-join wiring

---

### Phase 18: Organizer Invite Management

**Goal**: Organizers can view all sent invites for an event, resend magic links to specific participants, and revoke pending invites
**Depends on**: Phase 17
**Requirements**: INVT-03, INVT-04, INVT-05
**Note**: TMPL-01, TMPL-02, TMPL-03 apply. Organizer Invite Management screen template is MISSING — request template from user before implementing. Backend endpoint may need to be added if missing.
**Success Criteria** (what must be TRUE):
  1. Organizer opens Invite Management for an event and sees a list of all invites with participant name and status (pending/accepted)
  2. Organizer taps "Resend" for a participant and a new magic link email is sent
  3. Organizer taps "Revoke" on a pending invite — the invite is removed from the list and the link no longer works
**Plans**: TBD

Plans:
- [ ] 18-01: Request Organizer Invite Management screen template from user, then implement invite list view
- [ ] 18-02: Resend and revoke actions (add backend endpoint if missing, wire frontend)

---

### ✅ Phase 19: Offline Storage Strategy — AsyncStorage → SQLite + SecureStore — COMPLETE 2026-02-28

**Goal**: All local persistence uses the right tool for the job — expo-sqlite for non-sensitive structured data (cached events, wishlists), expo-secure-store for auth tokens, and AsyncStorage removed entirely. Offline mutation scope is explicitly defined: read-only caching only (no create/edit/delete without a live API connection), reflecting the planned paid-feature model.
**Depends on**: Phase 18
**Plans:** 4 plans

Plans:
- [x] 19-01-PLAN.md — SQLite database layer + SecureStore abstraction + cache utilities + DatabaseProvider
- [x] 19-02-PLAN.md — Migrate EventsContext from AsyncStorage to SQLite + remove AsyncStorage package
- [x] 19-03-PLAN.md — Native network detection (NetInfo) + offline banner + fix useSyncStatus for RN
- [x] 19-04-PLAN.md — Gap closure: scope EventsProvider inside authenticated guard so sign-out resets in-memory event state
- [x] 19-05-PLAN.md — Gap closure fix: revert to EventsProvider outside Stack.Protected with key={session} for correct remount

---

### Phase 20: Magic Link Redirect Website

**Goal:** A hosted redirect page handles magic link email URLs and routes users to the correct destination — mobile app via deep link if installed, or web redemption as fallback
**Depends on:** Phase 17
**Plans:** 2 plans

Plans:
- [ ] 20-01-PLAN.md — .well-known/ AASA + assetlinks.json files in web SPA public dir + simplify magic-link.tsx (remove gatherly:// custom scheme)
- [ ] 20-02-PLAN.md — app.json Universal Links config: associatedDomains (iOS) + intentFilters (Android) + bundleIdentifier

---

### Phase 21: Gatherly Next.js Website

**Goal:** A Next.js marketing website in `apps/web` showcasing Gatherly's features with a home page, download page, and a magic link redirect page that opens the mobile app directly at the magic link redemption screen via Universal Links / App Links deep link
**Depends on:** Phase 20
**Plans:** 5 plans

Plans:
- [ ] 21-01-PLAN.md — Monorepo scaffold: package.json, next.config.ts, tsconfig, postcss, globals.css, Nav, Footer, root layout, .well-known files
- [ ] 21-02-PLAN.md — Home page matching Home.png (hero, feature grid, mobile CTA) + VideoModal component
- [ ] 21-03-PLAN.md — Features page matching Features.png + How it Works page matching HowItWorks.png
- [ ] 21-04-PLAN.md — Download page matching Download.png + Pricing coming-soon stub
- [ ] 21-05-PLAN.md — Magic link redirect page (/magic-link/[token]) with deep link logic, intent:// fallback, not-installed state

---

## Progress

**Execution Order:** 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–10. v2.0 Phases | v2.0 | 27/27 | Complete | 2026-02-22 |
| 11. Navigation Foundation | v2.1 | 2/2 | Complete | 2026-02-23 |
| 12. Authentication Screens | v2.1 | 0/2 | Not started | - |
| 13. Events List + Details Screens | v2.1 | 2/2 | Complete | 2026-02-24 |
| 14. Edit Event Screen | v2.1 | 2/2 | Complete | 2026-02-25 |
| 15. My Wishlist Screen | v2.1 | 0/2 | Not started | - |
| 16. Event Wishlists + Claiming | v2.1 | 0/2 | Not started | - |
| 17. Join Event Screen | v2.1 | 2/2 | Complete | 2026-02-27 |
| 18. Organizer Invite Management | v2.1 | 0/2 | Not started | - |
| 19. Offline Storage Strategy | v2.1 | 4/4 | Complete | 2026-03-03 |
| 20. Magic Link Redirect Website | v2.1 | 2/2 | Complete | 2026-03-06 |
| 21. Gatherly Next.js Website | v2.1 | 0/5 | Not started | - |
