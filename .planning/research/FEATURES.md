# Feature Landscape — Gatherly v2.3 Pricing Plans

**Domain:** Group event coordination — freemium tier system, per-event upgrade model, paywall UX
**Researched:** 2026-03-27
**Confidence:** MEDIUM-HIGH — per-event model and paywall UX patterns well-documented; specific limit numbers benchmarked from comparable apps (no Gatherly-specific data)

---

## Executive Summary

Per-event upgrade is the correct model for Gatherly's infrequent-organiser usage pattern. Gatherly users organise 2–4 events per year; subscription friction is too high when Partiful, Elfster, and similar apps set a "free" baseline expectation. Comparable apps (Eventbrite, Luma) validate episodic/event-scoped billing. The `upgrade_required` 403 error is currently unhandled in the mobile client — the highest-priority engineering item is catching this error gracefully before any paywall UX is added.

---

## Per-Event vs Subscription Analysis

### Per-Event Upgrade (Recommended)

**Model:** Organiser pays once to unlock a single event's premium features. `plan_tier` on the event row flips from `'free'` to `'premium'`.

**Pros:**
- Zero ongoing commitment — no cancellation friction, no "subscription guilt"
- Aligns cost with value: user pays when they have a specific event with premium needs
- Scales with usage: power users who run many events pay more, casual users pay nothing or occasionally
- Simpler engineering: no recurring billing, no subscription state, no trial period management
- Better fit for event-coordination context: Eventbrite, Luma, and Ticketmaster all use per-event pricing

**Cons:**
- Lower LTV per user vs subscription (mitigated by per-event price being higher, e.g., £4.99 vs £1.99/mo)
- Harder to build recurring revenue predictability
- No "always-on" premium experience — premium expires when the event is over

**Verdict:** Use per-event for v2.3. Subscription can be layered as "Gatherly Pro" in a future milestone if retention data supports it.

### Subscription (Defer)

**Avoid for v2.3.** Subscription friction is too high for users who organise 2–4 events per year. The Splitwise model (subscription for a utility used constantly) doesn't translate to Gatherly's episodic usage. Build per-event first, validate conversion, then layer subscription for power users.

---

## Recommended Free Tier Limits

| Resource | Recommended Cap | Rationale |
|----------|----------------|-----------|
| Participants per event | **20** | Below 15 is punitive for a birthday party; above 25 loses upgrade leverage. Notion uses 10 guests (too low), Slack uses 15 users (low end). 20 covers most family/friend events. |
| Photos (photo album module) | **10 per event** | Enough to show value, insufficient for a full event album. Natural upgrade lever. |
| Wishlist items | **Unlimited** | Do NOT cap. Splitwise gated message history and caused mass churn. Wishlists are core product value — gating them punishes casual users with no upgrade motivation. |
| Potluck categories | **3 per event (trial)** | Enough to understand the feature; inadequate for a real dinner party (5–8 categories typical). Clear trial limit. |
| Poll questions | **1 per event (trial)** | Enough to see value; any real decision-making needs more. |
| RSVP | **Always enabled (reconsider premium)** | RSVP is arguably table-stakes for any event app. Keeping it premium weakens the core product. Recommend: make RSVP free (unlimited), keep polls/potluck/gift_exchange premium. |

---

## Table Stakes (Must Ship for Paywall UX to Feel Complete)

These are required for the milestone — a paywall that lacks any of these feels broken:

### 1. Graceful `upgrade_required` 403 handling

The mobile client currently crashes or shows a raw error when it receives `403 { error: 'upgrade_required' }` from the API. This must be fixed before any other paywall work. Every module API call that hits the plan tier check needs to route to the upgrade UI instead of an error state.

### 2. Locked module state in Module Config

Module Config screen must show locked modules with a lock icon and different visual treatment (greyed, lock badge) instead of just a disabled toggle. Tapping a locked module opens the upgrade prompt.

### 3. Contextual upgrade bottom sheet

A bottom sheet triggered from any locked feature tap. Shows:
- What is locked and why
- Contextual headline ("Unlock Polls for this event")
- Brief benefit statement (1–2 lines)
- Primary CTA: "Join the waitlist" or "Request access"
- Secondary: "Maybe later" (dismiss)

Triggered by: locked module tap, hitting participant cap, hitting trial limit.

### 4. Two-column plan comparison screen (`/pricing`)

Free vs Premium comparison showing what each tier includes. Accessible only from upgrade CTAs (not from main nav). Accepts `eventId` param — frames upgrade as per-event, not account-wide.

### 5. Stub upgrade CTA — demand capture

"Join the waitlist" beats "Coming soon". Waitlist captures a demand signal (user email + eventId) even before Stripe is live. A simple `upgrade_requests` table INSERT (email, event_id, feature, timestamp) gives product validation data before engineering Stripe.

### 6. Trial limit counters in UI

For modules with trial limits (potluck categories, polls), show proactive counters before the user hits the wall: "2 of 3 categories used · Upgrade for unlimited". This is UX-first enforcement — the API is the safety net.

---

## Differentiators (Good-to-Have)

These improve conversion but aren't required for a functional paywall:

- **Participant count badge** on the "Invite" button: "12/20 participants · Upgrade for unlimited" — visible at all times, not just at the wall
- **Feature preview** on locked modules in Module Config — a static screenshot/illustration of what the module looks like, shown in the bottom sheet before upgrade
- **Organiser-only upgrade prompts** — participants see "Ask [organiser name] to upgrade" copy instead of a CTA (prevents confusion and failed taps)
- **Post-upgrade confirmation** — a brief "Event upgraded!" success state before the premium feature unlocks

---

## Anti-Features (Explicitly Avoid)

| Feature | Why to avoid |
|---------|-------------|
| Gate wishlist item count | Replicates Splitwise's mass-churn mistake. Core product value should be free. |
| Hard paywall at app open | Pre-authentication paywalls destroy install-to-register conversion. Never block before the user has experienced value. |
| Participant cap below 15 | 15 is the minimum for "birthday party" viability. Below this is hostile to casual users. |
| Subscription billing in this milestone | No Stripe yet. Subscription requires recurring billing infrastructure. Per-event is simpler and more appropriate. |
| Countdown timers / artificial urgency | "Offer expires in 2:00" is dark UX. Gatherly is a trust product — urgency tactics erode that. |
| Blocking existing free data | If a user has 25 participants and a cap of 20 is introduced, do NOT delete or hide them. Preserve data, show "over limit" state, offer upgrade to restore full access. |
| Pricing in the stub | No price points on the pricing screen until validated. "Join waitlist" CTA only. |

---

## Paywall UX Patterns

### Contextual (Triggered at Locked Feature) — Recommended

- User taps a locked module or hits a limit
- Bottom sheet slides up with contextual copy
- "Upgrade this event" CTA
- Conversion rates 3–4× higher than entry-point paywalls (RevenueCat, 2024 data)
- Most conversions happen within 72 hours of first hitting a limit

### Feature Discovery (Plan Comparison Screen) — Recommended Supplement

- Accessible from upgrade CTAs only
- Two-column: Free vs Premium
- Specific feature list with checkmarks/locks
- "Request Access" CTA (stub) — no price shown

### Entry-Point Paywall — Avoid

- Showing upgrade prompt before the user has engaged with the feature
- Low conversion, high frustration

---

## Pricing Page Design Patterns

Based on comparable mobile apps (Notion, Luma, Superhuman, Todoist):

- **Mobile-first card layout** — two cards side by side or stacked vertically with clear visual hierarchy
- **Feature checklist** — bullet list with ✓ (included) and lock icons (requires upgrade), not lengthy descriptions
- **Free tier named "Free"** — not "Starter" or "Basic" — transparent naming builds trust
- **Premium tier named "Premium" or "Event Pro"** — specific to the event context
- **No price in stub** — "Request Early Access" or "Join the Waitlist" as the CTA
- **What you get in Free is prominent** — reassure the user that free is real, not a trial

---

## Stub CTA Recommendation

**"Join the Waitlist"** > "Coming Soon" > "Contact Us"

- "Coming soon" is dead copy — gives user nothing to do, signals indefinite delay
- "Contact us" routes to email which has high friction on mobile
- "Join the waitlist" is an action — user gets something (a place in line), Gatherly gets a demand signal

**Waitlist implementation (simple):**
- New route: `POST /api/upgrade-requests` — accepts `{ eventId, feature }`, inserts with user's email from JWT, returns `{ position: N }`
- Screen shows "You're on the waitlist" confirmation with position number
- No email sending required for the stub (add later)

---

## Open Questions for Roadmap

1. **RSVP tier placement** — should RSVP move to free? Currently premium. If yes, the module tier config changes.
2. **Photo album build scope** — should photo album be built in v2.3 (so its free-with-limit model is real) or kept "coming soon"?
3. **Waitlist vs external form** — in-app waitlist (new API endpoint) vs external Typeform/Tally link (zero backend work). External form is simpler for stub milestone.
4. **Price point validation** — £3.99–£7.99 is the defensible range for single-event unlock; needs user research to validate before Stripe milestone.

---

*Research completed: 2026-03-27*
*Ready for roadmap: yes*
