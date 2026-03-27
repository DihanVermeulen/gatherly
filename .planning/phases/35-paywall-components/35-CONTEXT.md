# Phase 35: Paywall Components - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the shared `PaywallBanner` component and `pricing` screen — the canonical upgrade UX that all other screens will route through in Phase 36. No individual screen invents its own upgrade flow; everything routes through these two artifacts.

</domain>

<decisions>
## Implementation Decisions

### PaywallBanner Presentation
- **Inline card** — not a modal or bottom sheet; the card sits as part of the screen
- **Fixed at the bottom of the screen** — pinned below content, always visible when a lock is active
- **Medium card size** — lock icon + headline + 1-2 lines of body copy + CTA button
- **Amber/gold visual style** — warm accent color suggesting premium/exclusive feel; not teal
- **Not dismissable** — stays until the user navigates away; the locked content is gone and the banner is the content

### Contextual Copy

| Trigger | Headline |
|---------|----------|
| `participant_cap` (20 guests reached) | "Free events are limited to 20 guests" |
| `potluck` trial limit (3 categories reached) | "Upgrade for unlimited potluck categories" |
| `polls` trial limit (1 poll reached) | "Upgrade for unlimited polls" |
| Premium module locked (`gift_exchange`, `white_elephant`) | "Unlock [Module Name] with Premium" (name-specific) |
| Magic-link participant (no upgrade CTA) | "Ask your organiser to upgrade this event" — no CTA button shown |

### Pricing Screen Layout
- **Two cards stacked** — Free card on top, Premium card below, each listing their features independently
- **No price points displayed** — stub CTA only (roadmap spec)
- **Feature rows to include:**
  - Guest limit: up to 20 (Free) vs Unlimited (Premium)
  - Polls: 1 (Free) vs Unlimited (Premium)
  - Potluck categories: 3 (Free) vs Unlimited (Premium)
  - Module access: White Elephant + Gift Exchange (Premium only)
- **Free card:** no CTA — purely informational
- **Premium card CTA:** "Request Access" button

### Upgrade CTA Flow
- Tapping "Request Access" shows a **confirmation alert** first: "You'll be taken to an external form to request Premium access." with Continue / Cancel
- On Continue: opens external URL via `expo-web-browser`
- **External URL:** hardcoded app constant (single URL in codebase)
- After organizer returns from external form: **nothing changes** — still free tier, no in-app acknowledgement needed (upgrade is a manual/backend process)

### Claude's Discretion
- Exact amber/gold hex values and card border radius
- Lock icon choice (emoji vs vector icon)
- Exact spacing and typography within the banner card
- Which screen file the PaywallBanner component lives in

</decisions>

<specifics>
## Specific Ideas

- Amber/gold should feel "premium" not "warning" — lean toward gold rather than amber-orange
- The pricing screen is only reachable via upgrade CTAs, not from main navigation (no tab or header link)
- `plansApi` client is part of Plan 35-01 scope alongside the component

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 35-paywall-components*
*Context gathered: 2026-03-27*
