# Roadmap: Gatherly

## Milestones

- ✅ **v2.0 Gift Exchange Platform** — Phases 1–10 (shipped 2026-02-22)
- ✅ **v2.1 Gatherly Mobile** — Phases 11–21 + 22–24, 27–29 (shipped 2026-03-16)
- ✅ **v2.2 UI Rehaul** — Phases 30–33 (shipped 2026-03-25)
- ✅ **v2.3 Pricing Plans** — Phases 34–38 (shipped 2026-04-08)
- 🚧 **v2.4 Navigation & UX Overhaul** — Phases 39–43 (in progress)

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

<details>
<summary>✅ v2.2 UI Rehaul (Phases 30–33) — SHIPPED 2026-03-25</summary>

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
- [x] 31-01-PLAN.md — Backend auth + types + AuthContext + welcome carousel + navigation guards
- [x] 31-02-PLAN.md — Profile Setup screen + Preferences screen + onboarding completion flow

#### Phase 32: Screen Redesigns
**Goal**: The three primary event screens match their new design templates, giving the app a consistent updated layout with cover photo, location, module cards, and global settings.
**Depends on**: Phase 30
**Requirements**: REDESIGN-01, REDESIGN-02, REDESIGN-03
**Success Criteria** (what must be TRUE):
  1. The Event Details screen shows module cards (Gift Exchange, Potluck) and displays the event cover photo hero and location when set
  2. The Manage Event screen exposes cover photo picker, location field, allow_guest_invites toggle, and is_public toggle alongside the existing guest list and active modules sections
  3. The Module Config screen matches the ModuleConfig.png template with the "Customize Your Event" redesign
**Plans:** 6 plans

Plans:
- [x] 32-01-PLAN.md — Backend API changes (organizerName, remove gift_exchange auto-insert) + Event Hub screen redesign
- [x] 32-02-PLAN.md — Manage Event redesign + edit-event-details sub-screen + Module Config redesign
- [x] 32-03-PLAN.md — Gap closure: wire coverPhotoUrl + organizerName via getById fetch
- [x] 32-04-PLAN.md — Gap closure: gate Secret Assignment card, remove bottom bar, fix inactive-module toast
- [x] 32-05-PLAN.md — Gap closure: fix cover photo deprecated API, native date picker, Save button width
- [x] 32-06-PLAN.md — Gap closure: useFocusEffect module reload + event list LinearGradient hero

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
**Plans:** 3 plans

Plans:
- [x] 33-01-PLAN.md — Potluck API client + Setup screen (organizer category builder + publish)
- [x] 33-02-PLAN.md — Potluck List screen (grouped view, progress bar, signup sheet, un-signup)
- [x] 33-03-PLAN.md — Gap closure: local-first optimistic category creation (fix "name is required" on Add New)

</details>

---

<details>
<summary>✅ v2.3 Pricing Plans (Phases 34–38) — SHIPPED 2026-04-08</summary>

See `.planning/milestones/v2.3-ROADMAP.md` for full phase details.

**Summary:** Per-event upgrade model with server-side tier enforcement (participant cap 20, potluck categories 3, polls 1), shared PaywallBanner/PaywallModal components wired across all 5 gated surfaces, and stub checkout + payment success screens — shipped across 5 phases and 9 plans.

</details>

---

### 🚧 v2.4 Navigation & UX Overhaul (In Progress)

**Milestone Goal:** Every primary action is reachable in 2 taps, the three main event screens are redesigned as coherent single surfaces, all screens use GlueStack UI components consistently, and anyone can join an event via a shared link without a per-participant invite.

#### Phase 39: Navigation Architecture
**Goal**: The app's navigation structure is corrected so all primary features are reachable within 2 taps, modals replace unnecessary stack pushes, and the tab bar behaves consistently across screen types.
**Depends on**: Phase 38
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. A user can reach any primary feature (wishlists, modules, event management) from the tab bar or event details in at most 2 taps — no dead ends requiring 3+ taps
  2. Edit Event sub-screens (`edit-event-details`, `manage-exclusions`) no longer push a new stack screen — their content is either inline on Edit Event or presented as a modal overlay
  3. Short forms and single-field edits (e.g., editing event name, date, location) appear as modal sheets rather than full-screen stack pushes
  4. The tab bar is visible on all tab-root screens and hidden on detail/edit screens, with back navigation remaining functional on all hidden-tab screens
**Plans:** TBD

Plans:
- [ ] 39-01-PLAN.md — Audit current nav structure + consolidate sub-screens (edit-event-details, manage-exclusions) into Edit Event or modals
- [ ] 39-02-PLAN.md — Convert short-form actions to modal presentation + validate 2-tap reachability across all primary features

#### Phase 40: Edit Event, Module Config, and Event Details UX
**Goal**: The three core event screens are redesigned as unified, scannable surfaces — organizers and participants immediately understand the available actions without navigating to sub-screens or decoding ambiguous UI.
**Depends on**: Phase 39
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Edit Event renders as a single scrollable screen — basic details, participant list, module toggles, and assignment actions are all visible without navigating away
  2. Module Config communicates each module's state (active, inactive, premium-locked, coming-soon) through distinct visual treatment — a first-time user can identify which modules are available vs locked without any explanation
  3. Event Details presents information in a clear three-section hierarchy (event header, key participant actions, modules) and the primary participant action (e.g., view wishlist, claim gifts) is immediately visible without scrolling
**Plans:** TBD

Plans:
- [ ] 40-01-PLAN.md — Edit Event single-surface redesign (inline details + participants + module toggles + assignment)
- [ ] 40-02-PLAN.md — Module Config visual state hierarchy + Event Details information architecture

#### Phase 41: UI Uniformity Sweep
**Goal**: Every screen in the app uses GlueStack UI components exclusively for text, inputs, pressables, and icons — no mixed component origins remain in screen files.
**Depends on**: Phase 40
**Requirements**: UNIFORM-01, UNIFORM-02, UNIFORM-03, UNIFORM-04
**Success Criteria** (what must be TRUE):
  1. No screen file imports `Text` or `View`-based text from `react-native` directly — all text rendering uses GlueStack `Text` or `Heading` from `components/ui/`
  2. No screen file uses `TouchableOpacity` from `react-native` — all interactive elements use GlueStack `Pressable` or `Button`
  3. No screen file uses raw `TextInput` from `react-native` — all input fields use GlueStack `Input`/`InputField`
  4. All icon usage across screen files comes from `lucide-react-native` — no imports from other icon libraries (e.g., `@expo/vector-icons`, `react-native-vector-icons`)
**Plans:** TBD

Plans:
- [ ] 41-01-PLAN.md — Audit all screen files for non-GlueStack component usage + replace Text/Heading imports
- [ ] 41-02-PLAN.md — Replace TouchableOpacity with Pressable/Button + TextInput with Input/InputField + icon library consolidation

#### Phase 42: Open Join Flow
**Goal**: Anyone with a join link or QR code can enter an event without the organizer sending them a personal invite — the join experience is seamless whether the user has an account or not.
**Depends on**: Phase 39
**Requirements**: JOIN-01, JOIN-02, JOIN-03, JOIN-04, JOIN-05
**Success Criteria** (what must be TRUE):
  1. An organizer can generate a shareable join link and QR code from within the app and share it via the native share sheet
  2. A user who opens a join link sees an event preview (name, date, organizer) then is prompted to enter their name — matching the name-entry UX of the magic link flow
  3. After joining, a user without an account sees a modal offering to create an account; declining stores a local participant session in SecureStore and enters the event immediately
  4. A user who already has an active session and opens a join link is auto-linked to their account — no duplicate participant record is created and they enter the event directly
  5. The join link endpoint on the backend generates a stable, unique token per event stored in the `events` table and resolves the event preview data without requiring authentication
**Plans:** TBD

Plans:
- [ ] 42-01-PLAN.md — Backend: join token generation + `GET /api/join/:token` preview + `POST /api/join/:token` participant creation with account-linking logic
- [ ] 42-02-PLAN.md — Mobile: Organizer share UI (link + QR code) + join screen (event preview + name entry + account offer modal + session storage)

#### Phase 43: Magic Link Account Linking Fixes
**Goal**: Magic link participant records are never duplicated — re-inviting an existing participant re-uses their record, and late account creation correctly links prior participation history.
**Depends on**: Phase 42
**Requirements**: MAGIC-01, MAGIC-02
**Success Criteria** (what must be TRUE):
  1. A guest participant who later creates an account with the same email address used in their magic link invite has all prior participation records (event memberships, wishlists, signups) correctly linked to their new account — no orphaned entries remain
  2. An organizer who sends a magic link to an email address that already has a participant record in the event receives the same invite link rather than a new one — no duplicate participant row is inserted
**Plans:** TBD

Plans:
- [ ] 43-01-PLAN.md — Backend: deduplicate invite creation + fix post-registration participant linking for prior magic-link sessions

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
| 31. Onboarding Screens | v2.2 | 2/2 | Complete | 2026-03-24 |
| 32. Screen Redesigns | v2.2 | 6/6 | Complete | 2026-03-22 |
| 33. Potluck Screens | v2.2 | 3/3 | Complete | 2026-03-25 |
| 34. Infrastructure | v2.3 | 2/2 | Complete | 2026-03-27 |
| 35. Paywall Components | v2.3 | 2/2 | Complete | 2026-03-28 |
| 36. Paywall Wiring | v2.3 | 2/2 | Complete | 2026-03-28 |
| 37. Paywall Polish | v2.3 | 1/1 | Complete | 2026-03-31 |
| 38. Checkout and Payment Success Screens | v2.3 | 2/2 | Complete | 2026-04-07 |
| 39. Navigation Architecture | v2.4 | 0/2 | Not started | - |
| 40. Edit Event, Module Config, and Event Details UX | v2.4 | 0/2 | Not started | - |
| 41. UI Uniformity Sweep | v2.4 | 0/2 | Not started | - |
| 42. Open Join Flow | v2.4 | 0/2 | Not started | - |
| 43. Magic Link Account Linking Fixes | v2.4 | 0/1 | Not started | - |
