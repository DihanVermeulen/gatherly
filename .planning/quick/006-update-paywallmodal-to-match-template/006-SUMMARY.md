# Quick Task 006 — Summary

## Task
Update PaywallModal to match the PayWall.png screen template.

## Changes Made

**File:** `apps/gatherly-mobile/components/PaywallModal.tsx`

Replaced the centered PaywallBanner card with a full scrollable pricing comparison layout:

- Page headline "Elevate your events" + contextual subtitle (driven by `feature` prop)
- Free tier card (gray, 4 feature rows)
- Premium tier card (amber) with RECOMMENDED badge, 6 feature rows
- "Upgrade" CTA for organizers; "Ask your organiser to upgrade" box for participants
- Trust section (ShieldCheck + Secure Payments copy)
- Help link ("Talk to an event specialist")
- Footer (Privacy Policy, Terms of Service, Restore Purchases)

PaywallBanner remains unchanged — still used as inline banner on individual screens.

## Commit
`41c24a6`
