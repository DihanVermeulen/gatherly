# Research Summary — Gatherly v2.3 Pricing Plans

**Project:** Gatherly Mobile — Freemium Tier Enforcement + Paywall UX (Stub Payment)
**Domain:** Per-event upgrade model, tier enforcement, paywall UX
**Researched:** 2026-03-27
**Confidence:** HIGH

---

## Executive Summary

Gatherly v2.3 introduces a freemium tier system built around a **per-event upgrade model** — organisers pay once to unlock premium features for a single event rather than subscribing. This is the correct model for infrequent organisers (2–4 events per year) where subscription friction is too high and competitors (Partiful, Elfster) have set a strong "free" baseline expectation. The existing codebase already has the full tier data flow in place (`plan_tier` on the `events` table, `planTier` on `TEvent`, `upgrade_required` 403 from the API), but the mobile client has no graceful handling of that 403 — fixing this is the highest-priority item before any paywall UX is added.

The milestone requires zero new npm packages. Every required UI primitive (modals, cards, gradient banners, bottom sheets, haptics) is already installed. The critical engineering risk is fragmentation: the codebase currently has three independent paywall implementations (`modules-config.tsx` inline modal, `potluck-setup.tsx` bespoke locked view, `event-details.tsx` unhandled premium taps). Building a single shared `<PaywallBanner>` component and a single `/pricing` route before touching individual screens is the non-negotiable architectural rule for this milestone — failing to do so will create a maintenance burden that blocks the Stripe billing milestone.

There are five product decisions that must be made before the roadmap is finalised (see Open Questions below). The most consequential is whether RSVP stays premium or moves to free, as this changes module tier configuration across API and mobile.

---

## Key Findings

### Recommended Stack — No New Packages Required

The paywall UX milestone is fully buildable with the existing stack. No npm installs are needed.

All required UI primitives are already present: `@gluestack-ui/core` for modals/cards, `expo-linear-gradient` for gradient banners, `@gorhom/bottom-sheet` for the paywall sheet variant, `expo-haptics` for upgrade confirmation feedback, `expo-web-browser` for the waitlist/contact CTA, and `expo-secure-store` for persisting upgrade interest flags.

**Libraries explicitly ruled out for this milestone:**

| Library | Why deferred |
|---------|-------------|
| `react-native-purchases-ui` (RevenueCat) | Active crash issues with Expo Router 6 nested routes + new architecture (GitHub Issues #1486, #1360, #1450, all 2025). Gatherly has `newArchEnabled: true` — adding this now breaks the build with no billing benefit. |
| `@stripe/stripe-react-native` | Requires native rebuild and root `StripeProvider`. No payment backend exists yet. Add at the billing milestone. |
| `expo-superwall` | Requires live App Store / Play Store products. Optimised for subscription funnels, not per-event purchases. Evaluate post-launch only. |
| `react-native-iap` | Unresolved new-architecture compatibility (Discussion #2754). No live store products to use it with. |

When RevenueCat is eventually added (billing milestone), add the **core SDK only** (`react-native-purchases`) and keep the pricing UI custom using the GlueStack screens built in this milestone.

See `.planning/research/STACK.md` for full version compatibility matrix and issue citations.

---

### Features — Tier Model and Limits

**Recommended free tier limits:**

| Resource | Free Limit | Rationale |
|----------|-----------|-----------|
| Participants per event | **20** | Below 15 is punitive for a birthday party; above 25 loses upgrade leverage. ARCHITECTURE.md used 10 as an example — 20 is the correct business decision per FEATURES.md competitive benchmarking. |
| Wishlist items | **Unlimited** | Do NOT cap. Splitwise gated message history and caused mass churn. Core product value must remain free. |
| Potluck categories | **3 per event** | Enough to trial the feature; a real dinner party needs 5–8, creating a natural upgrade moment. |
| Poll questions | **1 per event** | Enough to see value; meaningful polling needs more. |
| Photos (photo gallery) | **10 per event** | Natural upgrade lever — deferred from this milestone (gallery not built yet). |
| RSVP | **Recommend free** | Currently premium. RSVP is table-stakes for any event app; keeping it premium weakens the core product. See Open Questions. |

**Table stakes — required for the paywall to feel complete:**
1. Graceful `upgrade_required` 403 handling — mobile client currently shows raw error or crashes
2. Locked module visual state in Module Config (lock icon, greyed, tappable to upgrade prompt)
3. Contextual upgrade bottom sheet with feature-specific headline ("Unlock Polls for this event")
4. Two-column `/pricing` screen (Free vs Premium comparison, no price shown in stub)
5. Stub upgrade CTA that captures demand — "Join the waitlist" beats a dead "Coming Soon" button
6. Trial limit counters in UI before users hit the wall ("2 of 3 categories used · Upgrade for unlimited")

**Anti-features to explicitly avoid:**
- Hard paywall at app open or before first value experience
- Specific price points on the stub pricing screen (anchor risk before validation)
- Countdown timers / artificial urgency (Gatherly is a trust product)
- Deleting or hiding existing data when a cap is introduced — preserve data, show "over limit" badge, offer upgrade
- Subscription billing in this milestone (no Stripe, no infrastructure)
- Showing the upgrade CTA to magic-link participants (they cannot upgrade — show "Ask the organizer" copy)

See `.planning/research/FEATURES.md` for full paywall UX pattern analysis and competitive benchmarking.

---

### Architecture — Critical Fixes and Build Order

The tier data flow is already end-to-end. What is missing is consistent UX and enforcement completeness.

**Critical type mismatch to fix first:**

`TEvent.planTier` in `app/api/events.ts` (line 44) declares `'free' | 'standard'`. The DB column stores `'free'` / `'premium'`. The `modules.ts` route constant is `PREMIUM_MODULES`. These three are inconsistent. Everything must be unified to `'free' | 'premium'` before any paywall work begins.

**New files to create:**

| File | Purpose |
|------|---------|
| `components/PaywallBanner.tsx` | Reusable locked-feature banner; accepts `feature`, `eventId` props; branches copy for organiser vs participant |
| `app/pricing.tsx` | Upgrade destination; plan comparison + "Join Waitlist" CTA; accepts `?eventId=`; no price shown |
| `app/api/plans.ts` | `plansApi.upgrade(eventId)` thin API client |
| `app/constants/tiers.ts` | `FREE_PARTICIPANT_LIMIT`, `FREE_POTLUCK_CATEGORY_LIMIT` — business constants in one place |

**Files to modify:**

| File | Change |
|------|--------|
| `apps/api/src/routes/events.ts` | Add participant cap check on `POST /:id/participants`; add `POST /:id/upgrade` stub |
| `app/api/events.ts` | Fix `TEvent.planTier` union to `'free' \| 'premium'` |
| `app/_layout.tsx` | Register `pricing` screen in Stack |
| `app/modules-config.tsx` | Replace inline upgrade modal with `PaywallBanner` + `router.push('/pricing?eventId=...')` |
| `app/potluck-setup.tsx` | Replace bespoke locked view with `PaywallBanner` |
| `app/edit-event.tsx` | Add participant cap UI; handle `participant_cap_reached` 403 |
| `app/event-details.tsx` | Route premium module taps to `/pricing` on free events |

**Participant cap enforcement must be API-side AND client-side.** Three participant insertion paths exist: `POST /api/events/:id/participants`, `PUT /api/events/:id` (people array sync), and magic-link redemption. A shared server-side helper `assertParticipantCapNotExceeded(eventId)` must be called from all three — not just the obvious POST route.

**EventsContext refresh after upgrade:** After `POST /api/events/:id/upgrade` succeeds, call `refreshEvents()` before navigating back. The cached `planTier: 'free'` will otherwise persist and make the upgrade appear to have failed.

See `.planning/research/ARCHITECTURE.md` for full component boundary specification and dependency graph.

---

### Critical Pitfalls — Top 5

**1. Participant cap with multiple insertion paths (Critical)**
Three paths insert participants; enforcing the cap on only one allows silent bypass via the others. Use a shared server-side helper from all insertion routes. Must be in Phase 1 before any paywall UX work.

**2. Trial limit bypass via delete-and-recreate cycling (Critical)**
If limits count cumulative creates, a user can cycle (create 3 → delete 1 → create 1) to exceed the cap. Enforce on `COUNT(*) WHERE event_id = $1` at insert time — current active count, not lifecycle count.

**3. Fragmented upgrade CTAs that break when Stripe lands (Critical)**
Each screen currently has its own upgrade implementation. Build `<PaywallBanner>` as the single shared component before wiring any screen. When Stripe ships, one file changes. Without this, the billing milestone hunts down 5+ entry points.

**4. Pricing page anchors unvalidated price points (Critical)**
No price should appear on the stub pricing screen. "Request early access" or "Join the waitlist" only. Hard-coded price points set user expectations before the model is validated.

**5. Existing data orphaned at cap introduction (Critical)**
When a free event already has more participants than the new cap, do NOT delete or hide them. Policy must be defined before enforcement code is written: preserve all data, show "over limit" badge, offer upgrade to restore full access.

**Key moderate pitfalls:**
- Stale `planTier` in EventsContext after upgrade — always call `refreshEvents()` immediately post-upgrade
- Generic "Upgrade to Premium" on all surfaces — `<PaywallBanner>` must accept a `feature` prop for contextual headlines
- `/pricing` must only be reachable via upgrade CTAs, not main nav (participant confusion)
- `upgrade_required` and `trial_limit_reached` must be distinct API error codes — the mobile UI response differs for each
- Stub upgrade CTA must capture demand signal (email + eventId INSERT) — a dead button captures nothing before Stripe is built

See `.planning/research/PITFALLS.md` for all 12 pitfalls with severity ratings.

---

## Implications for Roadmap

Research points to a 4-phase build order derived from the dependency graph. The type mismatch fix is the only true cross-cutting blocker — once resolved, Phases 2 and 3 can overlap.

### Phase 1: Infrastructure (Unblocks Everything)

**Rationale:** The `'standard'` vs `'premium'` type mismatch will cause incorrect tier checks in every subsequent phase. The participant cap must cover all insertion paths from the start or free events will silently exceed limits. Policy decisions (what happens to existing data over limit) must be locked here before any enforcement screen is built. API error code contracts must be established before mobile error handling can be written.

**Delivers:**
- Unified `plan_tier = 'free' | 'premium'` across DB, API responses, and `TEvent` TypeScript type
- `app/constants/tiers.ts` with `FREE_PARTICIPANT_LIMIT` (20) and `FREE_POTLUCK_CATEGORY_LIMIT` (3)
- API participant cap on `POST /:id/participants` (and `PUT /:id` people sync and magic-link redemption) via shared helper
- Distinct API error codes: `participant_cap_reached` (with `limit`), `trial_limit_reached` (with `limit` and `resource`), separate from existing `upgrade_required`
- `POST /api/events/:id/upgrade` stub route (sets `plan_tier = 'premium'`, organiser-only, no payment)
- Data-preservation policy documented and implemented for over-limit events

**Avoids pitfalls:** #1 (multi-path cap), #2 (trial limit cycling), #5 (orphaned data), Pitfall #11 (conflated error codes)

**Research flag:** Standard patterns. Straightforward SQL and Express work following existing module route patterns. No additional research needed.

---

### Phase 2: Shared Paywall Components

**Rationale:** `<PaywallBanner>` and `/pricing` must exist before any individual screen changes. Building them second ensures every subsequent screen uses the canonical pattern — no per-screen upgrade implementations ever.

**Delivers:**
- `components/PaywallBanner.tsx` — accepts `feature` (drives contextual headline), `eventId`, `onUpgradePress`; organiser vs participant copy branch based on JWT discriminant
- `app/pricing.tsx` — plan comparison screen (`/pricing?eventId=X`); Free vs Premium feature table with Lucide Check/X icons; "Join the Waitlist" CTA (no price); calls `plansApi.upgrade()` for stub; calls `refreshEvents()` on success; navigates back
- `app/api/plans.ts` — `plansApi.upgrade(eventId)` API client
- `_layout.tsx` Stack.Screen registration for `pricing` route
- Demand capture: either `POST /api/upgrade-requests` (email + eventId + feature → `upgrade_requests` table) or external Typeform URL via `expo-web-browser` — see Open Questions

**Avoids pitfalls:** #3 (fragmented upgrade CTAs), #4 (no prices on stub screen), Pitfall #6 (refreshEvents called post-upgrade), Pitfall #7 (contextual copy via `feature` prop), Pitfall #8 (pricing not in main nav), Pitfall #10 (participant vs organiser copy), Pitfall #12 (demand signal captured)

**Research flag:** No additional research needed for the component and screen. The demand-capture mechanism (in-app vs external form) is an open product question — see below.

---

### Phase 3: Paywall Wiring Sweep

**Rationale:** With the shared component and pricing screen in place, each screen change is a simple replacement. Remove bespoke modal/locked-view JSX, add `<PaywallBanner>`, route to `/pricing`. No new patterns introduced.

**Delivers:**
- `modules-config.tsx` — replace `showUpgradeModal` state + inline Modal JSX (lines 131, 367–422) with `<PaywallBanner>` + pricing route; 403 catch on `handleToggle` routes to `/pricing`
- `potluck-setup.tsx` — replace bespoke locked view (lines 616–684) with `<PaywallBanner>`
- `edit-event.tsx` — participant cap UI (disable add button at cap, inline notice, handle `participant_cap_reached` 403 as upgrade prompt, not error toast)
- `event-details.tsx` — premium module tap on free event routes to `/pricing` instead of "Enable this module" toast

**Avoids pitfalls:** Pitfall #6 (stale planTier — `refreshEvents()` called on upgrade from shared pricing screen), Pitfall #9 (consistent limit enforcement across all entry points)

**Research flag:** No additional research needed — straightforward application of Phase 2 components.

---

### Phase 4: Trial Limit Counters

**Rationale:** Proactive counters ("2 of 3 categories used") require the constants from Phase 1 and the `<PaywallBanner>` from Phase 2. They are additive UX improvements that do not block the core paywall flow. No API changes required — counts derived client-side from existing response data.

**Delivers:**
- Potluck category counter in `potluck-setup.tsx`: "X of 3 categories used · Upgrade for unlimited"
- Poll counter: "1 of 1 polls used · Upgrade for unlimited"
- Participant count badge: "12/20 participants · Upgrade for unlimited" (visible before the wall, not just at it)

**Avoids pitfalls:** Pitfall #9 (proactive UI enforcement before users hit the API error)

**Research flag:** No additional research needed. Pattern is pure client-side count comparison against `tiers.ts` constants.

---

### Phase Ordering Rationale

- Phase 1 must be first: the type mismatch breaks every tier check; the multi-path participant cap is a correctness issue that cannot be deferred; error code contracts must exist before mobile error handling is written.
- Phase 2 must precede Phase 3: the "no new per-screen upgrade implementations" constraint can only be enforced if the shared component exists first.
- Phases 3 and 4 can be done in a single pass if time allows — Phase 4 touches the same files as Phase 3.
- Photo gallery (`comingSoon: true`) is explicitly out of scope — no DB schema, no route, no removal of the `comingSoon` flag unless scope is explicitly expanded.

### Research Flags

Phases needing deeper research before planning:
- **None.** All patterns are established in the codebase (module route structure, GlueStack modal patterns, EventsContext refresh pattern). The only unknowns are product decisions, not technical ones.

Phases with standard patterns (skip research-phase):
- **All four phases** follow existing codebase patterns. Phase 1 follows the `modules.ts` tier enforcement pattern. Phase 2 follows the `modules-config.tsx` modal pattern (extending it). Phases 3 and 4 are application of the Phase 2 components.

---

## Open Questions (Must Resolve Before Roadmap is Finalised)

These are product decisions that affect the roadmap structure. They cannot be resolved by engineering research alone.

| # | Question | Impact if unresolved | Recommendation |
|---|----------|---------------------|----------------|
| 1 | **RSVP tier placement** — move RSVP to free or keep premium? | Changes module tier config in `modules.ts` and the mobile module catalog; affects toggle behavior in `modules-config.tsx` and `event-details.tsx` | Move RSVP to free — it is table-stakes for any event app; premium gating weakens the core product |
| 2 | **Participant cap value** — 10 (used as example in ARCHITECTURE.md) or 20 (recommended in FEATURES.md)? | Defines `FREE_PARTICIPANT_LIMIT` constant; affects upgrade leverage and user hostility | Use 20 — FEATURES.md competitive benchmarking is more reliable than the architectural example |
| 3 | **Demand capture mechanism** — in-app `upgrade_requests` table (`POST /api/upgrade-requests`) or external Typeform/Tally link via `expo-web-browser`? | In-app requires new DB table + API endpoint; external form is zero backend work for the stub | External form (Typeform/Tally) for this milestone; switch to in-app if conversion data justifies it |
| 4 | **Photo gallery scope** — build gallery in v2.3 (with 10-photo free limit) or keep `comingSoon: true`? | Gallery requires storage strategy decision (S3/Cloudinary), new DB table, upload API — significant additional scope | Keep `comingSoon: true` for v2.3; resolve storage strategy in a dedicated research spike first |
| 5 | **Price point validation** — £3.99–£7.99 range identified; needs user research before Stripe milestone | Blocks the billing milestone from knowing what to charge | Schedule lightweight pricing interviews (5 users) before the Stripe milestone begins |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct in-repo inspection (`package.json`, `app.json`). No-new-packages conclusion backed by confirmed issue evidence for all deferred libraries. |
| Features | MEDIUM-HIGH | Per-event model and paywall UX patterns well-documented from comparable apps (Eventbrite, Luma, Notion, Splitwise). Specific limit numbers are benchmarked estimates, not Gatherly-specific data — need user validation before Stripe milestone. |
| Architecture | HIGH | Sourced entirely from live codebase inspection. Component boundaries, file paths, and line numbers are exact. Build order derived from actual dependency graph. Type mismatch confirmed by direct file inspection. |
| Pitfalls | HIGH | Grounded in specific codebase lines and patterns. Multi-path participant insertion confirmed by inspecting three distinct routes. Modal fragmentation confirmed by counting independent implementations. |

**Overall confidence:** HIGH

### Gaps to Address

- **Participant cap value (10 vs 20):** Product decision required before Phase 1 begins. Engineering can implement either; the business rationale needs explicit sign-off.
- **RSVP tier placement:** Changes the module catalog and API tier config. Needs product decision before Phase 1 begins (it affects the `PREMIUM_MODULES` constant).
- **Demand capture method:** In-app vs external form. Low-stakes decision but needs a call before Phase 2 begins so `pricing.tsx` is wired correctly.
- **RevenueCat new-arch stability:** STACK.md confidence is MEDIUM on the deferral of `react-native-purchases-ui`. Re-check active GitHub issues when the billing milestone begins — the core SDK (`react-native-purchases`) is more stable than the UI package.
- **Price point validation:** £3.99–£7.99 is an estimate from comparable apps. Schedule user research before the Stripe milestone.

---

## Sources

### Primary — HIGH confidence (direct codebase inspection)

- `apps/gatherly-mobile/app/api/events.ts` — `TEvent.planTier` type discrepancy at line 44 (`'free' | 'standard'` vs DB `'premium'`)
- `apps/api/src/routes/modules.ts` — `upgrade_required` 403 pattern, `PREMIUM_MODULES` constant
- `apps/api/src/db/schema.sql` — `plan_tier VARCHAR(50) DEFAULT 'free'` at line 217
- `apps/gatherly-mobile/app/modules-config.tsx` — existing upgrade modal (lines 368–422), `isFree` gating, `showUpgradeModal` state (line 131)
- `apps/gatherly-mobile/app/potluck-setup.tsx` — bespoke locked view pattern (lines 616–684)
- `apps/gatherly-mobile/app/event-details.tsx` — module card rendering, `handleModuleTap` (lines 236–274)
- `apps/gatherly-mobile/app/edit-event.tsx` — participant management UI structure (no cap enforcement)
- `apps/gatherly-mobile/package.json` — all installed packages and versions confirmed
- `apps/gatherly-mobile/app.json` — `newArchEnabled: true` confirmed

### Secondary — MEDIUM confidence (external research, 2025)

- RevenueCat GitHub Issues [#1486](https://github.com/revenuecat/react-native-purchases/issues/1486), [#1360](https://github.com/revenuecat/react-native-purchases/issues/1360), [#1450](https://github.com/revenuecat/react-native-purchases/issues/1450) — `react-native-purchases-ui` instability with Expo Router + new architecture (active as of 2025)
- RevenueCat 2024 benchmarks — contextual paywalls convert 3–4x higher than entry-point paywalls
- Comparable app analysis: Eventbrite, Luma, Partiful, Elfster, Notion, Splitwise, Todoist — tier model and limit benchmarking

### Tertiary — LOW confidence (inference / single source)

- Price range £3.99–£7.99 — inferred from comparable single-event premium pricing; needs user validation before Stripe milestone
- Splitwise churn from wishlist gating — community-reported pattern, cited without confirming source data

---

*Research completed: 2026-03-27*
*Ready for roadmap: yes — pending resolution of 5 open questions above*
