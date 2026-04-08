# Project Milestones: Gatherly

---

## v2.3 Pricing Plans (Shipped: 2026-04-08)

**Delivered:** Per-event upgrade model with full paywall UX — server-side tier enforcement, shared PaywallBanner/PaywallModal components, all 5 gated surfaces wired, and stub checkout + payment success screens — without real billing integration.

**Phases completed:** 34–38 (9 plans total)

**Key accomplishments:**

- Unified type system: `planTier: 'free' | 'premium'` across mobile and API; PREMIUM_MODULES reduced to white_elephant; polls/potluck/rsvp gated at usage creation level
- Server-side tier enforcement across 3 participant insertion paths (POST, PUT sync, magic-link redemption) + potluck category limit (3) + poll limit (1) with typed error contracts
- Shared `PaywallBanner` + `PaywallModal` components with contextual copy per feature type and organizer vs participant variants — amber card design, single canonical upgrade UX
- Full paywall wiring across all 5 gated surfaces: Module Config (lock icons), Event Details (premium module hiding), Potluck Setup (counter), Edit Event (participant badge), Polls (usage counter)
- Phase 37 polish: `isParticipant` threaded from `useSession()` at all call sites; `trial_limit_reached` 403 intercepted to open PaywallModal; magic-link cap-reached "event is full" state
- Checkout screen (order summary, express pay stubs, card form) + Payment Success screen (plan card, txId, post-upgrade refresh) — stub flow, any card details accepted

**Stats:**

- 56 files changed (7,474 insertions, 325 deletions)
- ~32,000 lines TypeScript (mobile + API)
- 5 phases, 9 plans
- 12 days (2026-03-27 → 2026-04-08)

**Git range:** `f2da840` (docs(34): research) → `882fe81` (test(38): UAT complete)

**Tech debt deferred:** UPGRADE_REQUEST_URL Typeform placeholder, /pricing orphan screen, Stripe billing (BILLING-01), photo gallery module

**What's next:** v2.4 — Real Stripe billing integration, photo gallery module, push notifications

---

## v2.1 Gatherly Mobile (Shipped: 2026-03-16)

**Delivered:** Full React Native mobile app (Expo 54 + GlueStack UI + Expo Router) with complete gift exchange feature parity, smart magic-link account linking, offline SQLite caching, and a Next.js marketing website — replacing the web app as the primary Gatherly client.

**Phases completed:** 11–21 + 22–24, 27–29 (34 plans total)

**Key accomplishments:**

- Built complete React Native mobile client from scratch — Events list, Event Details, Edit Event, My Wishlist, Event Wishlists (claiming), Join Event, Profile, and Organizer Invite Management screens, each matching its PNG template
- Delivered smart magic-link account linking: existing users auto-joined under their real account; new registrations link prior participant records; `role` field removed in favour of `participantId` discriminant
- Replaced AsyncStorage with expo-sqlite for structured caching + expo-secure-store for tokens; offline banner + mutation blocking; EventsProvider key={session} remount pattern
- Shipped Gatherly Next.js marketing website (apps/web) with Home, Features, How it Works, Download, Pricing stub, and magic-link redirect page with Universal Links / App Links deep link routing
- Added event metadata (date, wishlist deadline, countdown banner, wishlist progress bar), user profile screen, price tracking on wishlist items, and assignment/deadline reminder emails
- Rewrote magic-link join flow with 8-state machine, /lookup read-only preview endpoint, name-prompt state, and login/register upgrade banner for participant-only sessions

**Stats:**

- 358 files changed (65,902 insertions)
- ~22,927 lines TypeScript
- 14 phases, 34 plans
- 22 days from 2026-02-23 to 2026-03-16

**Git range:** `feat(11-01)` → `docs(28)`

**Known tech debt:**
- join.tsx missing refreshEvents() after QR code invite accept (GAP-01 — magic-link path is unaffected)
- assetlinks.json + associatedDomains use placeholder values (must replace before Universal/App Links work in production)

**What's next:** v2.2 — Public Wishlist share_token, Push Notifications, and Groups/Recurring Events

---

## v2.0 Gift Exchange Platform (Shipped: 2026-02-22)

**Delivered:** Full gift exchange platform featuring wishlist management with drag-to-reorder, anonymous gift claiming, JWT authentication, magic link participant invites, offline-first sync, and inline assignment reveal — replacing the legacy decipher code mechanic.

**Phases completed:** 1–10 (27 plans total, Phase 5 deferred)

**Key accomplishments:**

- Built complete wishlist system with image upload, priority levels, drag-to-reorder using @dnd-kit, and anonymous claiming with race condition protection via DB UNIQUE constraints
- Implemented full JWT authentication with 15-min access tokens, 7-day HttpOnly refresh cookies, and zero trust API protection across all routes
- Delivered offline-first sync via TanStack Query v5 with persistent cache, optimistic updates, offline mutation queue, and visual sync indicator
- Shipped magic link participant invites — email-based one-click join with reusable 7-day tokens, role-based access control (participants vs organizers), and resend capability
- Replaced decipher code mechanic with JWT-authenticated inline assignment reveal on the event details page
- Added shareable invite links + QR code generation for organizers with 5-state join page flow and participant registration

**Stats:**

- 173 files created/modified
- ~27,000 lines of TypeScript/TSX added (33,019 insertions)
- 10 phases, 27 plans
- 16 days from 2026-02-06 to 2026-02-22

**Git range:** `9c2abf3` (feat(01-02): database schema) → `67aae5e` (test(06): complete UAT)

**Deferred to v2.1:**
- Phase 5 (Mobile UI Redesign — Konsta UI, iOS-style bottom nav) — deprioritized in favor of auth and sync features
- Phase 4-03 (Organizer invite management UI — view/revoke list) — superseded by Phase 9's magic link invite flow

**What's next:** v2.1 — Mobile UI Redesign (Phase 5), image compression, and additional UX polish

---
