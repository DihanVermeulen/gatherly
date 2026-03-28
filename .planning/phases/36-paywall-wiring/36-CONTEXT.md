# Phase 36: Paywall Wiring - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the shared PaywallBanner and tier enforcement into all feature screens — Module Config, Potluck Setup, Edit Event, and Polls — replacing any bespoke locked states that exist today. Also wire the PaywallBanner as a proper modal (full-screen) so all screens can trigger it consistently.

</domain>

<decisions>
## Implementation Decisions

### Lock State Visuals
- Locked module treatment applies to Module Config screen only — NOT Event Details hub
- In Event Details hub: premium module cards are hidden entirely for free events (for both organizers and participants)
- Lock treatment: light grey tint + small lock icon in top-right corner of the card
- In Module Config: no toggle shown for locked modules — lock icon only (toggle hidden, not greyed out)
- Coming soon and premium-locked modules use the same grey tint treatment, differentiated by badge text only (e.g., "Coming Soon" badge vs lock icon)

### Counter / Badge Behavior
- **Edit Event participant badge** (`X/20 participants`): visible only when 15 or more participants exist (≥75% of cap); hidden below that threshold
- **Potluck Setup category counter** (`X of 3 categories · Upgrade for unlimited`): visible when 2 or more categories exist — matches roadmap spec
- **Polls counter** (`X of 1 polls used · Upgrade for unlimited`): always visible on free-tier events, regardless of current poll count

### PaywallBanner Trigger
- PaywallBanner is shown as a **full-screen modal** — Phase 36 is responsible for implementing this modal pattern (not already done in Phase 35)
- After dismissing the PaywallBanner: user stays on the current screen (no navigation back)
- Tapping "Request Access" CTA: opens external URL via expo-web-browser while the modal stays open behind it (no close-then-open sequence)

### Organizer vs Participant
- Module Config, Potluck Setup, Edit Event, and Polls screens are all organizer-only — no need to differentiate within these screens
- PaywallBanner itself already handles organizer ("Request Access") vs participant ("Ask your organiser to upgrade") copy from Phase 35
- Event Details hub: premium module cards hidden entirely for all users on free events (organizer and participants both see nothing)
- Polls screen: participants on free events can view existing polls and vote; only poll creation is subject to the 1-poll limit; the counter is only relevant to organizers creating polls

### Claude's Discretion
- Icon library choice for lock icon — use whatever is already imported in the codebase
- Exact grey tint opacity value for locked module cards
- Modal open/close animation for PaywallBanner full-screen modal

</decisions>

<specifics>
## Specific Ideas

- The roadmap success criterion #3 ("Event Details shows lock icon and grey overlay for premium modules") is superseded by user decision: premium modules are hidden entirely from the hub on free events, not shown with lock treatment
- Badge text differentiation between coming soon and locked premium modules — same visual treatment, different label

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-paywall-wiring*
*Context gathered: 2026-03-28*
