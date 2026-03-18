# Requirements: Gatherly v2.2 UI Rehaul

**Defined:** 2026-03-18
**Core Value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

## v2.2 Requirements

### Screen Redesigns

- [ ] **REDESIGN-01**: User sees event details as an Event Hub with module cards (Gift Exchange, Potluck, Memories)
- [ ] **REDESIGN-02**: Organizer can manage event via redesigned Manage Event screen (cover photo, location, guest list, active modules, global settings)
- [ ] **REDESIGN-03**: Organizer can configure event modules via redesigned Module Config screen matching new ModuleConfig.png template

### Welcoming Onboarding

- [ ] **ONBOARD-01**: New user sees 3-slide Getting Started splash screen (pre-auth) with dot indicators, Get Started CTA, and Log In link
- [ ] **ONBOARD-02**: Post-registration user can select interests from 13 categories (3+ minimum, Skip option, search bar)
- [ ] **ONBOARD-03**: Post-registration user can set up profile (name, bio, avatar, gift preferences) with Skip option
- [ ] **ONBOARD-04**: Onboarding flow shows only once per account — gated by server-side `onboarding_complete` flag on users table
- [ ] **ONBOARD-05**: Magic-link participant sessions never trigger onboarding flow (participantId discriminant check)

### Potluck Module

- [ ] **POTLUCK-01**: Organizer can create potluck categories with name, quantity stepper, food image, and suggestion chips
- [ ] **POTLUCK-02**: Organizer can publish potluck (sets module status from `draft` to `active`)
- [ ] **POTLUCK-03**: All event members can view grouped potluck list by category (claimed/unclaimed states)
- [ ] **POTLUCK-04**: Potluck list shows event readiness progress bar (total signups / total quantity needed)
- [ ] **POTLUCK-05**: Participant can claim a potluck slot via signup confirmation sheet (food image, item name, optional note)
- [ ] **POTLUCK-06**: Participant can withdraw their potluck claim (un-signup)
- [ ] **POTLUCK-07**: Signed-up names are visible to all event members (public — inverse of wishlist privacy model)

### Infrastructure

- [x] **INFRA-01**: DB migration adds `module_potluck_categories` and `module_potluck_signups` tables with UNIQUE constraint for race-safe claiming
- [x] **INFRA-02**: Potluck API routes in `modules.ts`: category CRUD, signup CRUD with ON CONFLICT 409 race guard, plan-tier check
- [x] **INFRA-03**: Events table gains `location`, `cover_photo_url`, `allow_guest_invites`, `is_public` columns
- [x] **INFRA-04**: Events list endpoint returns `hasCoverPhoto: boolean` flag only (not base64) to prevent payload bloat
- [x] **INFRA-05**: Users table gains `bio`, `interests TEXT[]`, `avatar_url`, `onboarding_complete` columns
- [x] **INFRA-06**: `PUT /api/users/me` refactored from positional `name: string` to patch-style `Partial<UserUpdate>` to support all new fields
- [x] **INFRA-07**: `GET /api/users/me` returns all new fields (`onboardingComplete`, `interests`, `bio`, `avatarUrl`)

## Future Requirements

### v2.3+ Candidates

- Interest data feeding event discovery / personalized feed — data captured in v2.2 but consumer deferred
- Push notification permission request — contextually after onboarding, not during splash
- Potluck templates for recurring setup
- Dietary restriction profiles (optional note field on signup sufficient for v2.2)
- Real-time potluck updates (WebSocket) — polling/refresh sufficient for v2.2
- Organizer preview mode on Potluck Setup screen

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interests feed/discovery consumer | Data captured in v2.2 but no feed feature exists yet — v2.3+ |
| Push notifications | Not planned for v2.2 — contextual permission timing post-onboarding is v2.3 |
| Dietary restriction database | Optional note field sufficient; liability implications |
| Potluck template/recurring setup | Power-user feature, scope for v3 |
| Real-time updates (WebSocket) | Adds complexity, polling/refresh sufficient |
| Payment integration | Gift purchasing happens externally |
| Chat/messaging | Communication happens outside the app |
| Web app (apps/gatherly) changes | Legacy web app maintained as-is; all new work in gatherly-mobile |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 30 | Complete |
| INFRA-02 | Phase 30 | Complete |
| INFRA-03 | Phase 30 | Complete |
| INFRA-04 | Phase 30 | Complete |
| INFRA-05 | Phase 30 | Complete |
| INFRA-06 | Phase 30 | Complete |
| INFRA-07 | Phase 30 | Complete |
| ONBOARD-01 | Phase 31 | Pending |
| ONBOARD-02 | Phase 31 | Pending |
| ONBOARD-03 | Phase 31 | Pending |
| ONBOARD-04 | Phase 31 | Pending |
| ONBOARD-05 | Phase 31 | Pending |
| REDESIGN-01 | Phase 32 | Pending |
| REDESIGN-02 | Phase 32 | Pending |
| REDESIGN-03 | Phase 32 | Pending |
| POTLUCK-01 | Phase 33 | Pending |
| POTLUCK-02 | Phase 33 | Pending |
| POTLUCK-03 | Phase 33 | Pending |
| POTLUCK-04 | Phase 33 | Pending |
| POTLUCK-05 | Phase 33 | Pending |
| POTLUCK-06 | Phase 33 | Pending |
| POTLUCK-07 | Phase 33 | Pending |

**Coverage:**
- v2.2 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial v2.2 definition*
