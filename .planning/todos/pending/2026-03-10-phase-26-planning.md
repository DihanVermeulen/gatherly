---
title: "Plan Phase 26 — Public Wishlist + Push Notifications + Groups"
area: planning
created: 2026-03-10
status: pending
---

## Problem

Phases 22–25 are complete. The roadmap lists Phase 26+ ideas but no formal phase has been defined or planned yet:

- **Public Wishlist** (`share_token`) — allow participants to share their wishlist via a public URL without requiring login
- **Push Notifications** — notify participants of new assignments, wishlist claims, event updates
- **Groups / Recurring Events** — allow organisers to manage groups of people across multiple events

## Solution

Run `/gsd:discuss-phase` or `/gsd:plan-phase` to scope and design Phase 26.

Suggested starting point: **Public Wishlist** as it is the most self-contained feature and directly extends the existing wishlist infrastructure.

## Notes

- Phase 25 introduced `plan_tier` and event modules — push notifications and groups may be premium features
- `share_token` column does not yet exist on the `wishlists` table; will need a migration
- Push notifications require Expo push token registration and a notification service (e.g., Expo Push API)
- Groups/recurring events is the largest scope item — likely a separate phase or milestone
