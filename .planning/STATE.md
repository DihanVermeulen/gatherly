# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.3 Pricing Plans — COMPLETE (shipped 2026-03-28)

## Current Position

Phase: 36 — Paywall Wiring
Plan: 02 of 2 complete
Status: Phase verified and complete
Last activity: 2026-03-28 — Phase 36 complete (PaywallModal, Module Config lock UI, Event Details hiding, Potluck counter, Edit Event badge, Polls counter)

Progress: [████████████████████████████████] v2.3 Pricing Plans complete

## Performance Metrics

**Velocity:**
- Total plans completed: 72 (27 v2.0 + 44 v2.1 + 1 v2.2)
- Average duration: ~5m
- Total execution time: —

**By Phase (v2.2):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 30. Infrastructure | 4 | — | — |
| 31. Onboarding Screens | 2/2 done | ~32m | ~16m |
| 32. Screen Redesigns | 6/6 done | ~55m | ~9m |
| 33. Potluck Screens | 3/3 done | — | — |

**By Phase (v2.3):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 34. Infrastructure | 2/2 done | ~? | — |
| 35. Paywall Components | 2/2 done | ~3m | ~1.5m |
| 36. Paywall Wiring | 2/2 done | ~5m | ~2.5m |

*Updated after each plan completion*

## Accumulated Context

### Decisions (active carry-forward)

- GlueStack UI — use components from components/ui/; no custom UI primitives
- Screen templates required before implementing any screen — if missing, ask user to create it
- SecureStore for token persistence — accessToken + user JSON; refreshToken lives in HttpOnly cookie only
- Use `npm install --ignore-scripts` in gatherly-mobile — pnpm virtual store dir length mismatch
- participantId-as-discriminant: user.participantId !== undefined = magic-link participant; absence = full account user
- fire-and-forget emails: sendX() called without await after route commits
- cover_photo must store URL string (not base64) in events table — list endpoint returns hasCoverPhoto flag only
- onboarding_complete is server-side source of truth — SecureStore is cache only, not authoritative
- Onboarding guard: use `user.onboardingComplete === false` (strict equality, not !user.onboardingComplete) — magic-link participants have undefined, not false
- welcome screen is first entry in unauth guard block — default landing for unauthenticated users
- onboarding screens registered in auth guard block (not a separate guard) — accessible to logged-in users
- router.replace('...as never') pattern for onboarding routes — Expo Router strict types don't include nested onboarding routes
- Onboarding completion pattern: usersApi.updateMe({ onboardingComplete: true }) + updateUser locally + router.replace('/(tabs)') — always in this order; catch block still calls updateUser locally (non-fatal)
- Gift Preferences field in profile-setup.tsx is cosmetic — no gift_preferences column in DB, field not sent to API
- expo-haptics required for Preferences screen chip toggles — installed via npm --ignore-scripts
- Trigger function name is update_updated_at_column() — not set_updated_at(); always use update_updated_at_column() in new migrations
- Phase 30 DB migration (014-phase30-v22.sql) applied — potluck tables, events columns (location/cover_photo/allow_guest_invites/is_public), users columns (bio/interests/avatar_url/onboarding_complete) all exist
- Phase 31 DB migration (015-phase31-onboarding.sql) applied — onboarding_complete now defaults to FALSE for new users
- Users API (30-02): GET /api/users/me returns all new profile fields; PUT /api/users/me is a dynamic patch — null clears bio/avatarUrl, onboardingComplete=false silently ignored (one-way), empty body returns 400
- usersApi.updateMe is now a patch object API: `updateMe({ name?, bio?, interests?, avatarUrl?, onboardingComplete? })` — NOT a string
- AuthContext exposes updateUser(patch: Partial<User>) helper — patches in-memory user + SecureStore cache
- Patch pattern: 'field in body' check + parallel params[]/clauses[] arrays + JSON.stringify for JSONB — use this pattern for future dynamic UPDATE routes
- Events API (30-03): list returns hasCoverPhoto boolean (no URL), detail/fetchEventById return coverPhotoUrl + location + allowGuestInvites + isPublic; PUT uses $1-$9 SET + $10 WHERE id with String(bool) coercion for optional boolean updates
- Events API (32-01): GET /api/events/:id now also returns organizerName (string|null) from users table lookup on organizer_id
- gift_exchange module is NO LONGER auto-inserted on POST /api/events — modules managed explicitly via modules-config screen
- MODULE_CATALOG pattern: define full module catalog client-side as static constant with type/label/description/icon/category/comingSoon; API active list gates interactivity only
- expo-linear-gradient installed in gatherly-mobile (npm --ignore-scripts) for hero gradient rendering
- expo-file-system installed in gatherly-mobile (npm --ignore-scripts) for cover photo base64 reading in edit-event-details
- expo-file-system EncodingType removed from main export in newer version — use string literal 'base64' instead of FileSystem.EncodingType.Base64
- Module Config auto-save pattern: optimistic update -> modulesApi.setModules(all active) -> revert on error; no Save button
- Module-gated UI pattern: wrap module-specific cards in activeModuleTypes.has('type') guard — Secret Assignment card is the canonical example
- Module Pressable disabled={isComingSoon} only — inactive (non-comingSoon) modules must remain tappable to show "Enable in Module Config" toast
- Modules are categorized: ACTIVITY (gift_exchange, white_elephant), COLLABORATION (potluck, expense_splitter, polls, rsvp), MEMORIES (photo_gallery)
- comingSoon modules: disabled toggle + grayed opacity + badge text; NOT sent to API
- showToast() helper: ToastAndroid.show() on Android, Alert.alert() on iOS — use for cross-platform toast
- Potluck API (30-04): participantName sourced from request body for both token types; slot_taken (409) covers both full-slot and duplicate-participant cases; SELECT FOR UPDATE race guard pattern for slot booking
- getById-on-mount pattern: screens needing detail fields (coverPhotoUrl, organizerName) call eventsApi.getById(id) in a useEffect and store in local state — list endpoint does not carry these fields; do NOT read detail fields from EventsContext
- v2.3 tier model: planTier is 'free' | 'premium' — 'standard' is incorrect and must not appear in code; free events cap at 20 participants, 3 potluck categories, 1 poll
- v2.3 error codes: participant_cap_reached (limit: 20), trial_limit_reached (limit: N, resource: string) — distinct from upgrade_required; mobile handles each differently
- v2.3 demand capture: external Typeform/Tally URL via expo-web-browser — no in-app upgrade_requests table; URL stored as app constant
- v2.3 PaywallBanner: single shared component for all upgrade UX; accepts feature + eventId props; organiser sees CTA, magic-link participant sees "Ask your organiser" copy
- v2.3 pricing screen: no price points shown — stub CTA only; only reachable via upgrade CTAs, not main nav
- v2.3 upgrade flow: PATCH /api/events/:id/upgrade -> refreshEvents() -> navigate back — always refresh before nav to clear stale planTier cache
- PaywallBanner CTA uses Pressable + native Text (not GlueStack Button) — inline amber hex colors conflict with NativeWind variant system
- PaywallBanner eventId prop is optional and intentionally unused in Phase 35 — acts as Phase 36 routing hook only
- PaywallModal pattern: useState<PaywallFeature | null>(null) — modal open when non-null; <PaywallModal isOpen={paywallFeature !== null} onClose={() => setPaywallFeature(null)} feature={paywallFeature!} />
- Module Config lock treatment: isLocked && !comingSoon -> hide Switch + show Lock icon (size 16, #94a3b8); wrap card in Pressable to open PaywallModal
- Event Details free-tier hiding: PREMIUM_MODULE_TYPES Set + isFree flag -> filter MODULE_CATALOG to remove premium entries on free events (no lock UI shown, just absent)
- PaywallBanner CTA: Alert.alert confirmation removed — WebBrowser.openBrowserAsync called directly
- UPGRADE_REQUEST_URL in constants/upgrades.ts is a placeholder — replace with real Typeform/Tally slug before launch
- Pricing screen (app/pricing.tsx): Free card uses gray Check icons, Premium uses amber Check icons — visual hierarchy without price points
- Pricing screen CTA disabled when eventId is empty string (default from useLocalSearchParams); disabled={!eventId} + opacity 0.5
- Potluck Setup: full-screen free-tier gate removed — free organizers see normal setup screen with amber category counter (visible at 2+)
- Category counter (X of 3) / participant badge (X/20) / poll counter (X of 1): amber #fffbeb bg, #92400e text — canonical counter style
- isFree derivation pattern: (event?.planTier ?? 'free') === 'free' — default to free defensively if event not yet loaded
- Cap guard dual pattern: guard inside action handler (handleAddCategory) + onPress conditional — belt-and-suspenders for all cap enforcements

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Redesign Event Hub module cards to match Details.png template | 2026-03-22 | 9aa37c8 | [001-...](./quick/001-redesign-event-hub-module-cards-to-match/) |
| 002 | (see quick/002) | — | — | [002-...](./quick/002-the-event-modules-in-the-event-hub-scree/) |
| 003 | Make event hub header match Details.png — back button in own header above banner | 2026-03-24 | 18d6e14 | [003-event-hub-header-match-details-png](./quick/003-event-hub-header-match-details-png/) |
| 004 | Create AppHeader component, replace all 10 inline header blocks across the app | 2026-03-24 | 845e184 | [004-modular-header-component](./quick/004-modular-header-component/) |

### Pending Todos

- `.planning/todos/pending/2026-03-10-phase-26-planning.md` — Plan Phase 26 (Public Wishlist + Push Notifications + Groups) — deferred to v2.3+

### Tech Debt

- join.tsx: add `await refreshEvents()` after `invitesApi.accept()` before `setJoinState("success")` (GAP-01)
- assetlinks.json SHA-256 fingerprint is a placeholder — replace before Android App Links work in production
- associatedDomains uses YOUR_DOMAIN placeholder — replace before iOS Universal Links work in production

### Pending DB Migrations for New Environments

- Migration 012 (v2.1): `psql -d gatherly -f apps/api/src/db/migrations/012-phase27-account-linking.sql`
- Migration 013 (v2.1): `psql -d gatherly -f apps/api/src/db/migrations/013-remove-role-from-users.sql` — also rotate JWT_SECRET + REFRESH_SECRET
- Migration 014 (v2.2): `psql -d gatherly -f apps/api/src/db/migrations/014-phase30-v22.sql` — potluck tables + events/users new columns
- Migration 015 (v2.2): `psql -d gatherly -f apps/api/src/db/migrations/015-phase31-onboarding.sql` — onboarding_complete defaults to FALSE

## Session Continuity

Last session: 2026-03-28
Stopped at: Phase 36 verified and complete — v2.3 Pricing Plans milestone finished
Resume file: None

Next step: /gsd:audit-milestone — audit v2.3 before archiving

Next step: Phase 36 complete. Plan Phase 37 (paywall backend wiring / upgrade flow).
