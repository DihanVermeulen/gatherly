---
phase: "22-24"
plan: "22-24"
subsystem: "profile, event-metadata, invite-management, pricing"
tags: ["postgresql", "express", "react-native", "typescript", "nodemailer", "gluestack-ui"]

dependency-graph:
  requires: ["phase-19", "phase-17", "phase-14"]
  provides: ["user-profile-api", "event-metadata-fields", "assignment-emails", "deadline-emails", "invite-resend", "price-tracking", "full-profile-screen", "event-countdown", "wishlist-progress"]
  affects: ["future-event-creation-forms", "future-budget-reporting"]

tech-stack:
  added: []
  patterns:
    - "fire-and-forget email pattern (sendAssignmentReadyEmail, sendDeadlineReminderEmail)"
    - "ADD COLUMN IF NOT EXISTS for safe schema migrations"
    - "pence integer storage for monetary values"
    - "CASE WHEN $N::text IS NOT NULL THEN ... ELSE col END for optional JSONB/timestamp updates"

key-files:
  created:
    - apps/api/src/routes/users.ts
    - apps/gatherly-mobile/app/api/users.ts
  modified:
    - apps/api/src/db/schema.sql
    - apps/api/src/services/emailService.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/wishlists.ts
    - apps/api/src/server.ts
    - apps/gatherly-mobile/app/api/events.ts
    - apps/gatherly-mobile/app/api/invites.ts
    - apps/gatherly-mobile/app/api/wishlists.ts
    - apps/gatherly-mobile/app/(tabs)/profile.tsx
    - apps/gatherly-mobile/app/event-details.tsx
    - apps/gatherly-mobile/app/edit-event.tsx
    - apps/gatherly-mobile/app/edit-wishlist-item.tsx

decisions:
  - "price_pence INTEGER (not DECIMAL) — avoids floating point rounding errors for monetary values"
  - "feature_flags JSONB DEFAULT '{}' — extensible without further migrations"
  - "sendAssignmentReadyEmail called inside try/catch after COMMIT, fire-and-forget — generate endpoint never fails due to email"
  - "loadInvites() called both on mount (event?.id dep) and after handleCreateInvite — keeps list fresh without polling"
  - "organizer_id already existed on events table (was referenced in events.ts) — schema.sql ADD COLUMN IF NOT EXISTS is safe re-run"

metrics:
  duration: "~12 minutes"
  completed: "2026-03-09"
---

# Phase 22-24: Profile, Event Metadata, Invite Management, and Pricing Summary

**One-liner:** Full user profile screen with name editing + event metadata fields (date, type, feature_flags) + fire-and-forget assignment/deadline emails + invite resend/revoke UI + pricePence budget tracking on wishlist items.

## What Was Built

### Backend (Phase 22 + 24)

**Schema migrations** appended to `schema.sql` using `ADD COLUMN IF NOT EXISTS`:
- `events.organizer_id` (INTEGER FK → users, ON DELETE SET NULL)
- `events.event_date` (TIMESTAMP)
- `events.wishlist_deadline` (TIMESTAMP)
- `events.event_type` (VARCHAR(50), default `'secret_santa'`)
- `events.feature_flags` (JSONB, default `'{}'`)
- `wishlists.price_pence` (INTEGER, nullable)
- Indexes on `organizer_id` and `event_date`

**`/api/users/me`** (GET + PUT) — authenticated endpoint returning profile + `eventsOrganized` count; PUT updates user name.

**Events route** — all list/get/create/update/fetchEventById paths propagate the four new event fields. GET `/:id` includes `totalWishlistCount` and `claimedCount` from a wishlist stats subquery. POST `/:id/generate` fires `sendAssignmentReadyEmail` fire-and-forget after COMMIT.

**Wishlists route** — GET/POST/PUT handlers include `price_pence` in SELECT, INSERT, UPDATE and responses.

**Email service** — two new functions: `sendAssignmentReadyEmail` and `sendDeadlineReminderEmail`. Both follow the existing fire-and-don't-block Ethereal test-account pattern.

### Mobile (Phases 22-24)

**`app/api/users.ts`** — new `usersApi` client with `getMe()` and `updateMe()`.

**`app/(tabs)/profile.tsx`** — replaced stub with full screen: avatar with initials, inline name editing (TextInput + save/cancel), stats row (events organised, account type), account info card (email, member since), sign-out button.

**`app/api/events.ts`** — `TWishlistItem` extended with `pricePence?: number | null`; `TEvent` extended with `eventDate`, `wishlistDeadline`, `totalWishlistCount`, `claimedCount`, `eventType`, `featureFlags`.

**`app/api/invites.ts`** — added `resend()` method calling `POST /api/events/:eventId/invites/:inviteId/resend-magic-link`.

**`app/api/wishlists.ts`** — `create()` and `update()` accept `pricePence?: number | null`.

**`app/event-details.tsx`** — event date added to stats row; wishlist progress bar (claimed/total); countdown banner (`N days to go!`) rendered via IIFE.

**`app/edit-event.tsx`** — new Invites card (shown when not locked) with status badges (Pending/Accepted), Resend button per pending invite, revoke (X) button per invite. Invites loaded on mount and refreshed after `handleCreateInvite`.

**`app/edit-wishlist-item.tsx`** — price input field with £ symbol, decimal-pad keyboard, converts to/from pence on load and save.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as specified.

## Authentication Gates

None — all endpoints use existing auth middleware.

## Next Phase Readiness

- Price display on wishlist cards (view-wishlists, my-wishlist screens) can use `pricePence` from `TWishlistItem`
- Budget summary per event is computable from `SUM(price_pence)` on the wishlists table
- `event_type` and `feature_flags` are ready for event-type-specific UI (Phase 24 extension)
- `wishlist_deadline` exists but no reminder scheduling is implemented yet — a cron/background job can call `sendDeadlineReminderEmail` when needed
