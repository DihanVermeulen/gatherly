# Roadmap: Gatherly

## Milestones

- ✅ **v2.0 Gift Exchange Platform** — Phases 1–10 (shipped 2026-02-22)
- ✅ **v2.1 Gatherly Mobile** — Phases 11–21 + 22–24, 27–29 (shipped 2026-03-16)
- 🚧 **v2.2 UI Rehaul** — Phases 30–33 (in progress)

## Phases

<details>
<summary>✅ v2.0 Gift Exchange Platform (Phases 1–10) — SHIPPED 2026-02-22</summary>

See `.planning/milestones/v2.0-ROADMAP.md` for full phase details.

**Summary:** Wishlist system, anonymous claiming, JWT auth, offline-first sync, magic link invites, inline assignment reveal — shipped across 10 phases and 27 plans.

</details>

<details>
<summary>✅ v2.1 Gatherly Mobile (Phases 11–21 + 22–24, 27–29) — SHIPPED 2026-03-16</summary>

See `.planning/milestones/v2.1-ROADMAP.md` for full phase details.

**Summary:** Full React Native mobile app (Expo 54 + GlueStack UI + Expo Router), offline SQLite caching, smart magic-link account linking, role simplification, organizer invite management, and Next.js marketing website — shipped across 14 phases and 34 plans.

</details>

---

### 🚧 v2.2 UI Rehaul (In Progress)

**Milestone Goal:** Implement new screen designs from screen templates, add a Welcoming onboarding flow for new users, and ship the Potluck collaboration module — backed by new API fields for location, cover photo, guest settings, user interests, and the full potluck data model.

#### Phase 30: Infrastructure — Migration and API
**Goal**: API and database schema contracts are locked so all mobile phases can build against real endpoints and real types.
**Depends on**: Phase 29 (v2.1 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. DB migration `014-phase30-v22.sql` runs cleanly and adds `module_potluck_categories`, `module_potluck_signups`, four new `events` columns, and five new `users` columns including `onboarding_complete`
  2. `GET /api/users/me` returns `onboardingComplete`, `interests`, `bio`, and `avatarUrl` fields
  3. `PUT /api/users/me` accepts a partial patch object (not positional `name` string) and updates any combination of `name`, `bio`, `interests`, `avatarUrl`, `onboardingComplete`
  4. Events list endpoint returns `hasCoverPhoto: boolean` without embedding base64 image data
  5. Potluck API routes exist for category CRUD and signup CRUD, returning 409 with "slot just taken" when a race conflict is detected
**Plans:** 4 plans

Plans:
- [x] 30-01-PLAN.md — DB migration (potluck tables, events columns, users columns)
- [x] 30-02-PLAN.md — Users endpoint refactor (GET + PUT /api/users/me patch-style)
- [x] 30-03-PLAN.md — Events endpoint updates (hasCoverPhoto, coverPhotoUrl, new columns)
- [x] 30-04-PLAN.md — Potluck routes (category CRUD + signup CRUD with race guard)

#### Phase 31: Onboarding Screens
**Goal**: New users are welcomed into the app through a guided first-run experience that captures preferences and profile data, shown once per account and never triggered for magic-link participant sessions.
**Depends on**: Phase 30
**Requirements**: ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05
**Success Criteria** (what must be TRUE):
  1. A user who has never registered sees a 3-slide splash carousel with dot indicators before reaching the login/register screens
  2. After registration, a full-account user is redirected to a profile setup and preferences flow before reaching the main app
  3. A user who completes or skips the onboarding flow is never shown it again — on any device or after reinstall
  4. A participant who joins via magic link is sent directly into the app with no onboarding screens shown
  5. The preferences screen allows selecting from 13 interest categories (minimum 3 or Skip) with a search bar and haptic feedback on toggles
**Plans:** 2 plans

Plans:
- [ ] 31-01-PLAN.md — Backend auth + types + AuthContext + welcome carousel + navigation guards
- [ ] 31-02-PLAN.md — Profile Setup screen + Preferences screen + onboarding completion flow

#### Phase 32: Screen Redesigns
**Goal**: The three primary event screens match their new design templates, giving the app a consistent updated layout with cover photo, location, module cards, and global settings.
**Depends on**: Phase 30
**Requirements**: REDESIGN-01, REDESIGN-02, REDESIGN-03
**Success Criteria** (what must be TRUE):
  1. The Event Details screen shows module cards (Gift Exchange, Potluck) and displays the event cover photo hero and location when set
  2. The Manage Event screen exposes cover photo picker, location field, allow_guest_invites toggle, and is_public toggle alongside the existing guest list and active modules sections
  3. The Module Config screen matches the ModuleConfig.png template with the "Customize Your Event" redesign
**Plans:** 3 plans

Plans:
- [x] 32-01-PLAN.md — Backend API changes (organizerName, remove gift_exchange auto-insert) + Event Hub screen redesign
- [x] 32-02-PLAN.md — Manage Event redesign + edit-event-details sub-screen + Module Config redesign
- [ ] 32-03-PLAN.md — Gap closure: wire coverPhotoUrl + organizerName via getById fetch

#### Phase 33: Potluck Screens
**Goal**: Organizers can set up a potluck with categorised items and quantities; all event members can view the live list and claim or withdraw slots with full visibility of who signed up.
**Depends on**: Phase 30
**Requirements**: POTLUCK-01, POTLUCK-02, POTLUCK-03, POTLUCK-04, POTLUCK-05, POTLUCK-06, POTLUCK-07
**Success Criteria** (what must be TRUE):
  1. An organizer can create potluck categories with a name, quantity, food image, and suggestion chips, then publish the potluck (changing status from draft to active)
  2. All event members see the potluck list grouped by category, with a readiness progress bar showing total signups vs total quantity needed
  3. A participant can tap an unclaimed slot, confirm via a signup sheet (food image, item name, optional note), and see their name appear on the list
  4. A participant who has signed up can withdraw their claim and the slot returns to unclaimed
  5. Signed-up participant names are visible to everyone in the event (not hidden, unlike wishlist claims)
  6. Free-tier events display a plan upgrade prompt instead of the potluck setup screen
**Plans**: TBD

Plans:
- [ ] 33-01: Potluck Setup screen (organizer category builder + publish)
- [ ] 33-02: Potluck List screen (grouped view, progress bar, signup confirmation sheet, un-signup)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–10. v2.0 Phases | v2.0 | 27/27 | Complete | 2026-02-22 |
| 11. Navigation Foundation | v2.1 | 2/2 | Complete | 2026-02-23 |
| 12. Authentication Screens | v2.1 | 2/2 | Complete | 2026-02-26 |
| 13. Events List + Details Screens | v2.1 | 2/2 | Complete | 2026-02-24 |
| 14. Edit Event Screen | v2.1 | 2/2 | Complete | 2026-02-25 |
| 15. My Wishlist Screen | v2.1 | 2/2 | Complete | 2026-02-26 |
| 16. Event Wishlists + Claiming | v2.1 | 2/2 | Complete | 2026-03-16 |
| 17. Join Event Screen | v2.1 | 2/2 | Complete | 2026-02-27 |
| 18. Organizer Invite Management | v2.1 | 2/2 | Complete | 2026-03-09 |
| 19. Offline Storage Strategy | v2.1 | 5/5 | Complete | 2026-03-03 |
| 20. Magic Link Redirect Website | v2.1 | 2/2 | Complete | 2026-03-06 |
| 21. Gatherly Next.js Website | v2.1 | 5/5 | Complete | 2026-03-07 |
| 22–24. Profile + Invites + Pricing | v2.1 | 1/1 | Complete | 2026-03-09 |
| 27. Smart Invite Join + Account Linking | v2.1 | 4/4 | Complete | 2026-03-13 |
| 28. Remove Account Roles | v2.1 | 1/1 | Complete | 2026-03-16 |
| 29. Phase 27 Fix — Smart Join Flow | v2.1 | 3/3 | Complete | 2026-03-13 |
| 30. Infrastructure — Migration and API | v2.2 | 4/4 | Complete | 2026-03-18 |
| 31. Onboarding Screens | v2.2 | 0/2 | Not started | - |
| 32. Screen Redesigns | v2.2 | 2/3 | In progress | - |
| 33. Potluck Screens | v2.2 | 0/2 | Not started | - |
