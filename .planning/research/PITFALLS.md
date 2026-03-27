# Research: Pitfalls — Gatherly v2.3 Pricing Plans

**Project:** Gatherly — Freemium Tier Enforcement and Paywall UX
**Researched:** 2026-03-27
**Confidence:** HIGH — pitfalls grounded in specific codebase lines and patterns

---

## Critical Pitfalls

### 1. Participant cap enforced client-side only

**Severity:** Critical

**Description:** Three participant insertion paths exist: `POST /api/events/:id/participants`, `PUT /api/events/:id` (people array sync), and the magic-link redemption route. If cap enforcement is only added to one path, free events can exceed the cap silently via the other two.

**Warning signs:** Free event has 12 participants despite a cap of 10. No error was logged.

**Prevention:** Enforce the participant cap in a shared DB-level check or in a middleware applied to ALL participant insertion paths — not just the obvious POST route. Add a DB-level constraint or a server-side helper `assertParticipantCapNotExceeded(eventId)` called from all three insertion points.

**Phase:** Infrastructure phase (before any paywall UX work).

---

### 2. Trial limit bypass via module toggle cycling

**Severity:** Critical

**Description:** If trial limits are enforced at the API level only on the "create" operation (e.g., max 3 potluck categories), a user could create 3 categories, delete 1, and create a new one — effectively bypassing the cap by cycling. The DB always has `<= 3` rows but the user has used more.

**Warning signs:** A free-tier potluck has more categories than the limit allows, all "current" records appear valid.

**Prevention:** Enforce limits on the current active count (a `COUNT(*)` query at creation time), not cumulative creates. `SELECT COUNT(*) FROM module_potluck_categories WHERE event_id = $1` at insert time is the correct check — not a lifecycle-based gate.

**Phase:** Infrastructure phase (API enforcement).

---

### 3. Upgrade CTA stub that breaks when Stripe lands

**Severity:** Critical

**Description:** If each paywall surface implements its own upgrade CTA (inline button, modal, etc.) with its own routing logic, the Stripe billing milestone must hunt down 4-6+ separate entry points. The stub that routes to a pricing screen must be a single shared component from day one.

**Warning signs:** `onUpgrade` handlers scattered across `modules-config.tsx`, `potluck-setup.tsx`, `event-details.tsx`, etc.

**Prevention:** Create a single `<UpgradePrompt>` component that accepts `eventId` and `feature` props before the second paywall touchpoint is built. All subsequent paywalls use this component. When Stripe lands, one file changes.

**Phase:** Shared component phase — before wiring individual screens.

---

### 4. Pricing page copy anchors unconfirmed pricing

**Severity:** Critical

**Description:** If the pricing screen includes specific price points (e.g., "£4.99 per event"), these numbers become anchored in users' expectations before the product is tested. They also become a source of embarrassment if the business model shifts.

**Warning signs:** Pricing screen has hardcoded `£4.99` or similar.

**Prevention:** The stub pricing screen should show tiers and features but replace the price with a neutral CTA: "Request early access" or "Join the waitlist — pricing coming soon". No price point should appear in the stub milestone.

**Phase:** Pricing page design.

---

### 5. Existing data orphaned on tier/limit changes

**Severity:** Critical

**Description:** If a free event is grandfathered in with 15 participants, then a cap of 10 is introduced, what happens? If a paid event has 5 potluck categories and its `plan_tier` is downgraded (by admin), which categories are shown? The data exists but the UI enforces a limit.

**Warning signs:** Free event shows "over limit" badge but all data is still visible. Ambiguous UI state.

**Prevention:** Define the downgrade/cap policy before building enforcement: either (a) data is always preserved but hidden/locked with "upgrade to access", or (b) hard deletion on downgrade. Option (a) is strongly recommended for user trust. Apply it consistently across all capped resources.

**Phase:** Infrastructure phase (policy decision must be made before API work begins).

---

## Moderate Pitfalls

### 6. Plan tier cache stale at enforcement time

**Severity:** Moderate

**Description:** `planTier` in `EventsContext` is the cached value from the last fetch. If an upgrade action occurs and the cache is not invalidated, the paywall will reappear on the next interaction — making the upgrade appear to have failed. This is a critical UX failure post-Stripe.

**Warning signs:** User taps "upgrade", sees success, then immediately hits the paywall again.

**Prevention:** After any upgrade action (even stub), call `queryClient.invalidateQueries(['event', eventId])` to force a fresh fetch. Establish this pattern now in the stub so it's automatic when Stripe lands.

**Phase:** Upgrade flow implementation.

---

### 7. Contextual paywall copy too generic

**Severity:** Moderate

**Description:** Showing "Upgrade to Premium" for every locked feature produces copy blindness. A user trying to add an 11th participant sees the same message as a user trying to enable Polls. Generic paywalls have lower conversion.

**Warning signs:** `UpgradePrompt` component has no `feature` prop — always shows the same headline.

**Prevention:** The `<UpgradePrompt feature="participant_cap" | "potluck" | "polls" | ...>` prop drives contextual headlines: "Need more room?" vs "Unlock Polls". Implement this from the first component build.

**Phase:** Shared component phase.

---

### 8. Pricing page reachable from non-upgrade paths

**Severity:** Moderate

**Description:** If `/pricing` is accessible from the main nav or settings, users on free events with no intention to upgrade will browse it — generating noise in future analytics. More importantly, it may confuse participants who can't upgrade.

**Warning signs:** Pricing page is accessible from the bottom tab bar or event settings for all users.

**Prevention:** The pricing screen should only be reachable via explicit upgrade CTA. It should accept `eventId` as a required param — making it an event-specific upgrade screen, not a global marketing page. Link from paywall prompts only, not from the main nav.

**Phase:** Pricing page implementation.

---

### 9. Free tier limits inconsistently applied across entry points

**Severity:** Moderate

**Description:** The participant cap might be enforced on invite, but not on manual "add participant" flow. Trial limits for potluck might block the API but show no UX hint before the user attempts the action, causing a confusing 403.

**Warning signs:** User successfully adds a participant via QR code but gets a 403 on the manual flow. Or user fills in a full potluck category form and only sees an error on submit.

**Prevention:** Enforce limits proactively in the UI (disable "Add Participant" button when at cap, show remaining slots counter) so users never hit the API error in the first place. API enforcement is the safety net; UI is the first line.

**Phase:** Paywall wiring sweep phase.

---

### 10. Upgrade CTA shown to participants who cannot upgrade

**Severity:** Moderate

**Description:** Magic-link participants (`participantId` in JWT) cannot upgrade events — only organizers can. If the `<UpgradePrompt>` component shows an upgrade button to participants, it will confuse them and the button will fail (API returns 403 on any organizer action).

**Warning signs:** Participant taps "Upgrade to Premium", sees an error or dead screen.

**Prevention:** `<UpgradePrompt>` must check `user.participantId !== undefined` (the existing discriminant). If participant: show "Ask the organizer to upgrade this event" copy instead of the CTA button. This is the same guard used for onboarding.

**Phase:** Shared component phase.

---

### 11. Trial limit error code conflated with module-blocked error

**Severity:** Moderate

**Description:** The existing plan tier check returns `403 { error: 'upgrade_required' }`. If trial limit caps (e.g., max 3 categories) reuse the same error code, the mobile client cannot distinguish "this module is entirely locked" from "you've hit the trial limit on a module you have access to". The paywall copy and upgrade prompt differ for these cases.

**Warning signs:** Free-tier event with potluck enabled shows "Unlock Potluck" paywall instead of "You've reached your category limit" message.

**Prevention:** Introduce a distinct error code: `403 { error: 'trial_limit_reached', limit: 3, resource: 'potluck_categories' }`. Mobile checks for both error codes separately. Add this to the API in the infrastructure phase before any trial-limit screens are built.

**Phase:** Infrastructure phase (API error contract).

---

### 12. Stub upgrade button emits no signal — demand is invisible

**Severity:** Moderate

**Description:** If the stub upgrade CTA is a dead button ("Coming Soon") or a passive display, there is no way to measure how much demand exists before Stripe is built. This is a missed opportunity to validate the per-event pricing model.

**Warning signs:** Upgrade button has no action; no analytics or waitlist email is captured.

**Prevention:** Even in the stub milestone, the upgrade CTA should capture intent: navigate to a "Request Early Access" screen that records the user's email and eventId to an `upgrade_requests` table (simple INSERT). This data validates the pricing model before engineering effort is invested in Stripe.

**Phase:** Pricing page / upgrade flow implementation.

---

## Summary

| # | Title | Severity |
|---|-------|----------|
| 1 | Participant cap enforced client-side only | Critical |
| 2 | Trial limit bypass via module toggle cycling | Critical |
| 3 | Upgrade CTA stub that breaks when Stripe lands | Critical |
| 4 | Pricing page copy anchors unconfirmed pricing | Critical |
| 5 | Existing data orphaned on tier/limit changes | Critical |
| 6 | Plan tier cache stale at enforcement time | Moderate |
| 7 | Contextual paywall copy too generic | Moderate |
| 8 | Pricing page reachable from non-upgrade paths | Moderate |
| 9 | Free tier limits inconsistently applied across entry points | Moderate |
| 10 | Upgrade CTA shown to participants who cannot upgrade | Moderate |
| 11 | Trial limit error code conflated with module-blocked error | Moderate |
| 12 | Stub upgrade button emits no signal — demand invisible | Moderate |

---

*Research completed: 2026-03-27*
