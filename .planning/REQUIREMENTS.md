# Requirements: Gatherly v2.3 Pricing Plans

**Defined:** 2026-03-27
**Core Value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

## v2.3 Requirements

### Infrastructure

- [ ] **INFRA-01**: `TEvent.planTier` type updated from `'free' | 'standard'` to `'free' | 'premium'` to match DB and API
- [ ] **INFRA-02**: Participant cap of 20 enforced server-side across all 3 insertion paths (`POST /participants`, `PUT /events` people sync, magic-link redemption) — returns `{ error: 'participant_cap_reached', limit: 20 }` 403
- [ ] **INFRA-03**: Trial limits enforced server-side: potluck categories max 3 on free events, polls max 1 on free events — returns `{ error: 'trial_limit_reached', limit: N, resource: '...' }` 403
- [ ] **INFRA-04**: RSVP module plan_tier check removed — RSVP is free for all events
- [ ] **INFRA-05**: Stub upgrade route `PATCH /api/events/:id/upgrade` — sets `plan_tier = 'premium'` (organizer only, idempotent, returns updated event)

### Upgrade Flow

- [ ] **UPGRADE-01**: `upgrade_required` 403 handled gracefully on mobile — routes to PaywallBanner instead of crashing or showing raw error state
- [ ] **UPGRADE-02**: Upgrade CTA links to configurable external form URL (Typeform/Tally) — URL stored as an app constant

### Paywall UX Components

- [ ] **PAYWALL-01**: Shared `<PaywallBanner>` component — accepts `eventId` + `feature` props; contextual headline per feature (`participant_cap`, `potluck`, `polls`, `gift_exchange`, `white_elephant`); organiser sees "Request Access" CTA; participant (participantId discriminant) sees "Ask your organiser to upgrade this event"
- [ ] **PAYWALL-02**: Pricing comparison screen (`app/pricing.tsx`) — Free vs Premium two-column feature list, "Request Access" CTA (external form link), no price point shown, accessible only via `?eventId=X` param from upgrade CTAs (not from main nav)

### Paywall Wiring

- [ ] **WIRE-01**: Module Config — premium modules show lock icon + disabled toggle; tapping locked module opens PaywallBanner (replaces existing bespoke upgrade modal)
- [ ] **WIRE-02**: Potluck Setup — PaywallBanner for `upgrade_required` plan tier block (replaces existing full-screen locked view) + "X of 3 categories · Upgrade for unlimited" counter visible when 2+ categories exist
- [ ] **WIRE-03**: Event Details — module cards show locked visual state (lock icon, grey overlay) for premium modules on free events; tapping opens PaywallBanner
- [ ] **WIRE-04**: Edit Event — participant count badge "X/20 participants" always visible in guest list section; Add Participant disabled with PaywallBanner when at cap
- [ ] **WIRE-05**: Polls — "1 of 1 polls used · Upgrade for unlimited" counter + PaywallBanner when limit is hit on create

## Future Requirements (v2.4+)

### Billing

- **BILLING-01**: Stripe integration — per-event payment processing, webhook for plan_tier upgrade on payment success
- **BILLING-02**: Payment history screen — organiser can see which events have been upgraded and when
- **BILLING-03**: Receipt/invoice delivery — email confirmation on upgrade

### Photo Gallery Module

- **PHOTO-01**: Photo gallery module implementation — upload, view, 10-photo free limit
- **PHOTO-02**: Photo gallery paywall — "X of 10 photos · Upgrade for unlimited" counter + PaywallBanner

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe billing | Deferred to v2.4 — stub CTA (external form) is sufficient to validate demand |
| RevenueCat / Superwall | Active new-arch issues; per-event model doesn't fit subscription SDK assumptions |
| Photo gallery module build | Deferred to v2.4 — keep `comingSoon: true` in module catalog |
| Subscription model | Per-event validated first; subscription can layer in v2.5+ if retention data supports it |
| Price points in UI | No price shown in stub — prevents anchoring before model is validated |
| In-app waitlist table | External form (Typeform/Tally) sufficient for demand capture — zero backend work |
| Wishlist item gating | Core product value — gating causes churn (Splitwise precedent) |
| Participant cap below 20 | Hostile to casual users; 20 covers most birthday parties and family events |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 34 | Complete |
| INFRA-02 | Phase 34 | Complete |
| INFRA-03 | Phase 34 | Complete |
| INFRA-04 | Phase 34 | Complete |
| INFRA-05 | Phase 34 | Complete |
| UPGRADE-01 | Phase 35 | Complete |
| UPGRADE-02 | Phase 35 | Complete |
| PAYWALL-01 | Phase 35 | Complete |
| PAYWALL-02 | Phase 35 | Complete |
| WIRE-01 | Phase 36 | Pending |
| WIRE-02 | Phase 36 | Pending |
| WIRE-03 | Phase 36 | Pending |
| WIRE-04 | Phase 36 | Pending |
| WIRE-05 | Phase 36 | Pending |

**Coverage:**
- v2.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initial v2.3 definition*
