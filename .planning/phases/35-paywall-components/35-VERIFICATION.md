---
phase: 35-paywall-components
verified: 2026-03-28T11:56:37Z
status: passed
score: 4/4 must-haves verified
notes:
  - "Gap 1 (modules-config bespoke modal) is Phase 36 scope — WIRE-01 explicitly covers replacing it. Phase 35 delivered the canonical primitives; Phase 36 wires them in."
  - "Gap 2 (CTA copy) dismissed — 'Upgrade to Premium' is correct UX copy. The spec wording 'Request Access' was an error; the button leads to a payment/upgrade step, not an access request."
---

# Phase 35: Paywall Components Verification Report

**Phase Goal:** The shared PaywallBanner component and pricing screen exist as the canonical upgrade UX, so no individual screen ever invents its own upgrade flow.
**Verified:** 2026-03-28T11:56:37Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Any `upgrade_required` 403 routes to PaywallBanner instead of raw error/crash | FAILED | modules-config.tsx has its own bespoke upgrade modal; PaywallBanner is imported by zero screens |
| 2 | Organiser sees "Request Access" CTA opening external URL; participant sees "Ask your organiser" with no CTA | PARTIAL | Participant copy correct. CTA wires to WebBrowser. But button text is "Upgrade to Premium" not "Request Access". PaywallBanner orphaned. |
| 3 | PaywallBanner headline is contextual for participant_cap, potluck, polls, gift_exchange, white_elephant | VERIFIED | getHeadline() covers participant_cap, potluck_trial, polls_trial, and module_locked variant handles gift_exchange and white_elephant |
| 4 | Pricing screen shows Free vs Premium comparison, no price points, only via upgrade CTAs | VERIFIED | pricing.tsx: Free card (3 rows) + Premium card (5 rows), no price/billing text, not in tab nav |

**Score:** 2/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/gatherly-mobile/components/PaywallBanner.tsx` | Shared paywall banner | ORPHANED | EXISTS, 127 lines, substantive — but NOT imported by any screen |
| `apps/gatherly-mobile/constants/upgrades.ts` | UPGRADE_REQUEST_URL constant | VERIFIED | EXISTS, exports UPGRADE_REQUEST_URL, imported by PaywallBanner and pricing.tsx |
| `apps/gatherly-mobile/app/api/plans.ts` | plansApi wrapping PATCH /upgrade | VERIFIED | EXISTS, 14 lines, exports plansApi.upgrade() |
| `apps/gatherly-mobile/app/pricing.tsx` | Pricing comparison screen | VERIFIED | EXISTS, 158 lines, Free + Premium cards, no price points, AppHeader with back nav |
| `apps/gatherly-mobile/app/_layout.tsx` | pricing route in authenticated block | VERIFIED | Line 179: name="pricing" inside Stack.Protected |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| PaywallBanner.tsx | constants/upgrades.ts | import UPGRADE_REQUEST_URL | WIRED | Line 6 |
| PaywallBanner.tsx | expo-web-browser | WebBrowser.openBrowserAsync | WIRED | Line 60 |
| pricing.tsx | constants/upgrades.ts | import UPGRADE_REQUEST_URL | WIRED | Line 9 |
| pricing.tsx | expo-web-browser | WebBrowser.openBrowserAsync | WIRED | Line 45 |
| pricing.tsx | components/AppHeader | AppHeader with onBack | WIRED | Line 63 |
| app/api/plans.ts | PATCH /api/events/:id/upgrade | apiClient.patch | WIRED | Line 11 |
| Any screen | PaywallBanner | import + render | NOT WIRED | PaywallBanner imported by 0 screens |
| modules-config.tsx | PaywallBanner | — | NOT WIRED | Uses its own bespoke Modal instead |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/gatherly-mobile/app/modules-config.tsx | 414 | CTA onPress calls setShowUpgradeModal(false) with text "Coming Soon" | Blocker | Organiser hitting the upgrade gate sees a dead-end modal, not the canonical upgrade flow. Violates the "no individual screen invents its own upgrade flow" goal. |
| apps/gatherly-mobile/constants/upgrades.ts | 5 | UPGRADE_REQUEST_URL contains literal PLACEHOLDER slug | Warning | External URL will fail to open until replaced. Not a code bug but a launch-blocking configuration gap. |

### Human Verification Required

None — all gaps are structurally verifiable from the code.

### Gaps Summary

Phase 35's goal is that no individual screen ever invents its own upgrade flow. That goal is not yet achieved.

**Gap 1 — modules-config.tsx bypasses PaywallBanner.** The screen catches upgrade_required 403 errors and shows a bespoke GlueStack Modal with custom copy ("Standard Plan", "All modules · Unlimited participants · Priority support") and a "Coming Soon" button that simply dismisses the modal. This is exactly the anti-pattern the phase was meant to prevent. PaywallBanner is imported by zero screens.

**Gap 2 — CTA copy mismatch.** PaywallBanner CTA button reads "Upgrade to Premium". The pricing screen CTA reads "Request Access". The phase goal specifies "Request Access" for the organiser CTA. The two canonical surfaces are inconsistent.

**What Phase 35 did deliver correctly:**

- PaywallBanner with amber styling, contextual headlines, isParticipant variant, and Alert+WebBrowser CTA flow
- UPGRADE_REQUEST_URL as single source of truth for the external form URL
- plansApi.upgrade() wrapping PATCH /upgrade
- pricing.tsx with Free/Premium comparison, no price points, back navigation
- pricing route registered in the authenticated Stack.Protected block

**What is missing for the goal to be achieved:**

1. modules-config.tsx must replace its bespoke modal with PaywallBanner
2. PaywallBanner CTA button text should read "Request Access" to match pricing screen and phase spec

---

_Verified: 2026-03-28T11:56:37Z_
_Verifier: Claude (gsd-verifier)_
