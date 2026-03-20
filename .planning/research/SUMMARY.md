# Project Research Summary

**Project:** Gatherly Mobile v2.2 — Potluck Module, Welcoming Onboarding, Event Cover Photo, UI Rehaul
**Domain:** Group event coordination mobile app — feature expansion on an existing React Native / Expo Router codebase
**Researched:** 2026-03-17
**Confidence:** HIGH

---

## Executive Summary

Gatherly v2.2 is an additive milestone on a mature mobile codebase, not a greenfield build. This means the architecture research is unusually precise: nearly every decision is constrained by what already exists (JWT shape, module toggle scaffolding, image storage patterns, navigation guard structure). The recommended approach is a strict dependency-ordered 4-phase build — Infrastructure (migration + API) first, then Onboarding screens, then Event Edit UI, then Potluck screens. Deviating from this order forces stub data and rework.

The two headline features — Potluck Module and Welcoming Onboarding — are both partially scaffolded. Potluck has a recognized `module_type = 'potluck'` in `event_modules` and a paywall stub in the UI, but no tables, routes, or screens. Onboarding has screen templates and an `expo-secure-store` auth layer to build on, but no onboarding flow exists. Both features are well-understood through competitor analysis and screen templates; the templates in `screen-templates/Potluck/` and `screen-templates/Welcoming/` are authoritative design specs that tightly bound the scope.

The dominant risks are not architectural unknowns — they are specific, preventable implementation mistakes grounded in the existing codebase: a race condition on potluck slot claiming, the onboarding flag being stored in the wrong place (device-only vs server), base64 cover photos bloating the events list endpoint, and the `usersApi.updateMe()` positional name-only signature breaking when new fields are added. Each has a clear prevention strategy. The roadmap should sequence to encounter these risks in Phase 1 where schema and type decisions are locked before mobile work begins.

---

## Key Findings

### Recommended Stack

The existing stack (Expo 54, GlueStack UI, NativeWind, Expo Router, TanStack Query v5, `react-native-reanimated` 4.1.6) requires only three new packages for v2.2. All three are in Expo SDK 54's `bundledNativeModules.json` and are confirmed compatible with `newArchEnabled: true` in `app.json`. No backend npm dependencies change — API additions are schema and route work only.

**New packages (mobile only):**
- `react-native-pager-view` v6.9.1 — native swipeable pager for the Getting-Started splash; `ScrollView pagingEnabled` has Android jank and fragile dot-sync
- `expo-image` ~3.0.11 — disk-cached display for potluck food photo URLs; `react-native-fast-image` is explicitly excluded — it does not support the new React Native architecture
- `expo-haptics` ~15.0.8 — tactile feedback on interest tag toggles and potluck signup confirmation

**No new packages needed for:**
- Cover photo: `expo-image-picker` already installed, same pattern as wishlist image picker
- Onboarding gate: `expo-secure-store` already installed, already the auth persistence layer
- Interest chips: GlueStack `Pressable` + NativeWind classes compose to toggle chips
- Progress bar: GlueStack `Progress` + `ProgressFilledTrack` already in `components/ui/progress/`

See `STACK.md` for version matrix and install commands.

### Expected Features

Screen templates are authoritative design specs. Competitor analysis (SignUpGenius, PerfectPotluck, withlome) and onboarding research (NNGroup, Appcues) validate the patterns.

**Must have — Potluck (P1 table stakes):**
- Category management: name, quantity stepper, food image, suggestion chips (organizer)
- Save and Publish control — sets `event_modules.status` from `'draft'` to `'active'`
- Grouped list by category with claimed (avatar) vs unclaimed (Signup button) states
- Signup confirmation sheet: food image, item name, optional note, Confirm/Cancel
- Un-signup (withdraw claim)
- Event readiness progress bar (SUM signups / SUM quantity needed)

**Must have — Welcoming Onboarding (P1 table stakes):**
- 3-slide paginated splash (dot indicators, "Get Started" CTA, "Already have an account? Log In")
- Interest chip selection: 13 categories, Select 3+ guidance, Skip option, search bar
- Profile Setup: name, bio, gift preferences, avatar picker, "Skip for now" option
- Step progress indicator ("Step 1 of 3")
- Onboarding shown once — `onboarding_complete` flag on `users` table (server source of truth), cached in SecureStore

**Should have (P2 differentiators for v2.2):**
- Organizer preview mode on Potluck Setup screen
- Real-time potluck claim updates via polling (same pattern as wishlist claiming)
- Per-category coverage indicators on the potluck list

**Defer to v2.3+:**
- Interest data feeding event discovery / feed personalization — data captured in v2.2 but has no consumer yet
- Push notification permission requests — request contextually post-onboarding, not during splash
- Potluck template/recurring setup — power-user feature, scope for v3
- Dietary restriction profiles — optional note field on signup is sufficient; dietary database has liability implications

See `FEATURES.md` for anti-features rationale and full dependency maps.

### Architecture Approach

The build follows a 7-step dependency chain. DB migration 012 unblocks API work; API work unblocks the mobile type layer; the type layer unblocks all mobile screens. Steps 5 (onboarding) and 6 (event fields UI) can run in parallel after step 4 (AuthContext state). Step 7 (potluck screens) is gated on steps 2 and 3.

**New components introduced by v2.2:**
1. `apps/api/src/db/migrations/012-phase-v22.sql` — potluck tables (`module_potluck_categories`, `module_potluck_signups`), four new `events` columns, five new `users` columns
2. Potluck API routes (added to `modules.ts`) — category CRUD with slot pre-population + signup CRUD with race-safe conflict guard
3. Extended `users.ts` route — patch-style PUT accepting `bio`, `interests`, `avatarUrl`, `onboardingComplete`; GET returns all new fields
4. `AuthContext` onboarding state — `onboardingComplete: boolean` + `markOnboardingComplete()`, seeded from `GET /api/users/me` during `restoreSession`
5. `app/welcome.tsx` — pre-auth getting-started splash (unauthenticated stack)
6. `app/onboarding.tsx` — post-register 3-step flow (authenticated stack, `gestureEnabled: false`)
7. `app/potluck.tsx` + `app/potluck-setup.tsx` — participant list and organizer category builder

**Hard architectural constraints from existing system:**
- JWT shape: organizer tokens carry `userId`, participant tokens carry `participantId`. Onboarding must check `user.participantId === undefined` before redirecting — magic-link guests must never hit the onboarding flow.
- `_layout.tsx` redirect priority chain must be preserved: magic-link token > invite code > onboarding incomplete. Onboarding is lowest priority.
- Potluck privacy model is the inverse of wishlists: wishlists hide `claimedBy`; potluck must expose `signedUpBy` to all event members. A separate route file enforces this distinction explicitly.
- `cover_photo_url` must store a URL string (not base64) in the `events` table. The list endpoint aggregates multiple events and cannot carry base64 blobs.

See `ARCHITECTURE.md` for full component boundaries, API endpoint definitions, and data flow diagrams.

### Critical Pitfalls

1. **Potluck signup race condition** — two participants claim the same slot simultaneously. Prevention: `UNIQUE(category_id, slot_index, participant_id)` on `module_potluck_signups`, atomic `UPDATE ... WHERE participant_id IS NULL` inside a transaction, 409 response with "slot just taken" + auto-refresh on mobile. Do NOT do a SELECT then INSERT outside a transaction.

2. **Onboarding flag in SecureStore only** — flag is lost on reinstall or new device; user sees onboarding again and overwrites first-run interest selections. Prevention: `onboarding_complete BOOLEAN DEFAULT FALSE` column on `users` table; returned by `GET /api/users/me`; SecureStore is a cache only, not the source of truth.

3. **Onboarding fires for participant (magic-link) sessions** — guest participants have no `users` row; `PUT /api/users/me` returns 403 with their token; navigation is stuck because `gestureEnabled: false`. Prevention: check `user.participantId === undefined` in onboarding redirect guard; `PUT /api/users/me` must use `requireOrganizer` middleware.

4. **`cover_photo` base64 in events list endpoint** — payload grows from ~5KB to 500KB+ per event with photos; SQLite cache bloats. Prevention: list endpoint returns `hasCoverPhoto: boolean` flag only; full image only in `GET /api/events/:id`.

5. **`usersApi.updateMe()` positional signature** — current signature is `updateMe(name: string)`. Adding interests, bio, and onboarding flag requires refactoring to `updateMe(patch: Partial<UserUpdate>)` before any screen can call it with new fields. Must happen in Phase 1 (API layer) before onboarding screens are built.

See `PITFALLS.md` for the full list of 13 pitfalls with warning signs.

---

## Implications for Roadmap

Research points to a 4-phase build order derived from the dependency chain.

### Phase 1: Infrastructure — Migration and API

**Rationale:** Every other phase is blocked on this. The DB migration defines the schema contract; the API and type changes define the interface contract. No mobile phase can be integrated until routes exist to call and TypeScript types exist to consume. The race condition prevention and cover photo strategy must also be locked here before mobile work begins.

**Delivers:**
- `012-phase-v22.sql`: `module_potluck_categories`, `module_potluck_signups` tables with UNIQUE constraint; four new `events` columns; five new `users` columns (including `onboarding_complete`)
- Extended `events.ts` routes: new columns in SELECT; list endpoint returns `hasCoverPhoto` (not base64); PUT accepts new fields
- Extended `users.ts` routes: patch-style PUT accepting all new fields; GET returns `onboardingComplete`, `interests`, `bio`, `avatarUrl`
- New potluck routes in `modules.ts`: categories CRUD with slot pre-population; signups CRUD with ON CONFLICT race guard; module-active check pattern from polls
- Updated `TEvent` type: all new fields typed as `field?: Type | null`
- `usersApi.updateMe()` refactored from positional `name: string` to `patch: Partial<UserUpdate>` object

**Avoids:** Race condition (UNIQUE in migration), cover photo list bloat (hasCoverPhoto flag), updateMe signature breakage (refactored before screens are built).

**Research flag:** Standard patterns — follows Phase 25 migration and `modules.ts` route structure exactly. No additional research needed.

---

### Phase 2: Onboarding Screens

**Rationale:** Depends on Phase 1 (users API additions, `UserProfile` type). Does not depend on potluck. Should be built before potluck because it touches `_layout.tsx` and `AuthContext` — changes that could affect potluck navigation if done out of order. Validating the navigation guard changes in isolation reduces integration risk.

**Delivers:**
- `AuthContext` updated: `onboardingComplete` state + `markOnboardingComplete()`, seeded from `GET /api/users/me` during `restoreSession`
- `app/welcome.tsx` — unauthenticated 3-slide splash carousel (`react-native-pager-view`, dot indicators, CTA)
- `app/onboarding.tsx` — authenticated 3-step flow (Profile Setup: avatar, name, bio, gift preferences; Preferences: interest chips with haptics)
- `_layout.tsx`: redirect priority chain (magic-link > invite > onboarding), new Stack.Screen entries for `welcome` and `onboarding`
- `register.tsx` + `sign-in.tsx`: redirect to `/onboarding` when `onboardingComplete === false` and `participantId` is absent
- Install `react-native-pager-view` + `expo-haptics`

**Implements:** All Welcoming Flow P1 features from FEATURES.md.

**Avoids:** Onboarding firing for magic-link sessions (participantId check), onboarding flag lost on reinstall (server-side source of truth), navigation race with magic-link redirect (documented priority chain).

**Research flag:** Standard patterns. Stack.Protected guard and SecureStore usage are established in this codebase. No additional research needed.

---

### Phase 3: Event Edit UI — Cover Photo and New Fields

**Rationale:** Depends only on Phase 1 (API + TEvent type). Smallest phase. Placing it after Phase 2 keeps `_layout.tsx` changes isolated to one phase at a time. No downstream dependencies — potluck does not depend on event cover photo.

**Delivers:**
- `edit-event.tsx`: location text field, cover photo picker (expo-image-picker, 16:9 crop, permission guard), allow_guest_invites toggle, is_public toggle
- `event-details.tsx`: location display and cover photo hero using `expo-image` (remote URL, disk cache)
- SQLite cache migration for new event columns (`hasCoverPhoto: boolean` flag only — no base64 in cache)
- Install `expo-image`

**Avoids:** Image picker silent failure on iOS (requestMediaLibraryPermissionsAsync guard), new event fields with nullable type drift, SQLite cache missing new columns.

**Research flag:** Standard patterns. `expo-image-picker` pattern already in `edit-wishlist-item.tsx`. Direct copy with field additions.

---

### Phase 4: Potluck Screens

**Rationale:** Largest phase, most new surface area. Depends on Phase 1 (potluck API routes and `TPotluckCategory`/`TPotluckSlot` types). Benefits from Phases 2 and 3 having validated that `AuthContext` and `_layout.tsx` changes are stable. Sequencing it last ensures infrastructure is fully settled before tackling the new feature with the most complex data flow.

**Delivers:**
- `app/potluck-setup.tsx` — organizer category builder: name input, quantity stepper, food image display (`expo-image`), suggestion chips, Add Category, Save and Publish
- `app/potluck.tsx` — participant grouped list (`SectionList` by category), claimed (avatar) vs unclaimed (Signup button), readiness progress bar; organizer sees same view
- Signup confirmation bottom sheet: food image hero (`expo-image`), item name field, note field, Confirm (with `expo-haptics` Success notification), Cancel
- Un-signup flow
- Route wiring in `event-details.tsx` — remove empty-string route on potluck module row
- Plan tier check in potluck screens — render paywall/upgrade state (not generic error) for free-tier events

**Implements:** All Potluck P1 features from FEATURES.md.

**Avoids:** Potluck using wishlist's claimedBy-hidden privacy model (separate route file, explicit "PUBLIC" comment), plan tier 403 showing generic error, duplicate claims (handled by Phase 1 UNIQUE constraint).

**Research flag:** The Signup confirmation display pattern (bottom sheet vs full-screen modal) should be verified against existing GlueStack modal usage in the codebase before implementation starts.

---

### Phase Ordering Rationale

- Phase 1 is mandatory first: schema and API types are the contract that all mobile phases consume. Building screens against stubs forces rework.
- Phase 2 (Onboarding) before Phase 4 (Potluck) because onboarding modifies `AuthContext` and `_layout.tsx` — the foundational navigation layer. Potluck navigation layers on top of a stable auth/routing foundation.
- Phase 3 (Event fields) is the smallest phase with no downstream dependencies. Placing it between the two larger phases provides a low-risk ship point and validates the `expo-image` install before potluck needs it.
- Phase 4 is last: largest scope, benefits from validated infrastructure and confirmed stable navigation guard behavior from Phases 2 and 3.

### Research Flags

Phases needing a quick pre-implementation check:
- **Phase 4 (Potluck):** Verify which GlueStack or Expo component to use for the Signup confirmation sheet (`Potluck-Signup.png` shows a full-screen modal) before implementation starts.

Phases with standard patterns (no additional research needed):
- **Phase 1 (Infrastructure):** Follow `011-phase25-modules-polls-rsvp.sql` as the exact migration template. Polls route structure in `modules.ts` is the model for potluck routes.
- **Phase 2 (Onboarding):** SecureStore, Stack.Protected, and PagerView patterns are in-repo or SDK-documented.
- **Phase 3 (Event fields):** `edit-wishlist-item.tsx` is the direct template for the cover photo picker flow.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against in-repo `bundledNativeModules.json` and `package.json`. New arch compatibility confirmed via `app.json` inspection. All 3 new packages are first-party or Expo-bundled. |
| Features | HIGH | Screen templates are authoritative specs — scope is tightly bounded by design. Competitor analysis (SignUpGenius, PerfectPotluck) confirms potluck data model. Onboarding patterns verified against NNGroup and Appcues research. |
| Architecture | HIGH | All decisions sourced from direct codebase inspection. JWT shape, navigation guard structure, module route patterns, and wishlist claiming logic all observed in live files. No inference. |
| Pitfalls | HIGH | All critical pitfalls grounded in specific lines or patterns in the codebase. Race condition approach sourced directly from `wishlists.ts` ON CONFLICT implementation. `updateMe` signature issue confirmed in `users.ts`. |

**Overall confidence: HIGH**

### Open Questions to Resolve During Planning

- **Food photo source for potluck categories:** The screen templates show per-category food images. Architecture stores these as `image_url TEXT`. But who provides the URL? Options: organizer pastes a URL, organizer uploads a photo, or Gatherly ships a curated library. This is a product decision with UI flow implications for `potluck-setup.tsx`. Must be resolved during Phase 4 planning — the column supports all three options without schema changes.

- **Interests data consumer:** The Preferences screen title says "Personalize Your Feed" but no feed or discovery feature exists. `users.interests TEXT[]` is captured in v2.2 but has no consumer until v2.3+. The roadmap should explicitly note this so the prompt text on the Preferences screen accurately sets expectations ("Help us suggest events" rather than "Personalize Your Feed" if the feed doesn't exist yet).

- **Expo Go vs dev build for testing:** Expo Go pre-grants image picker permissions; the actual permission prompt can only be validated in a development build. Phase 3 should include an explicit dev build test step for the cover photo permission flow on both iOS and Android.

---

## Sources

### Primary (HIGH confidence — in-repo verification)

- `apps/gatherly-mobile/node_modules/expo/bundledNativeModules.json` — version constraints for all 3 new packages, confirmed in-repo
- `apps/gatherly-mobile/app.json` — `newArchEnabled: true` (drives expo-image choice over react-native-fast-image)
- `apps/gatherly-mobile/app/_layout.tsx` — Stack.Protected guard structure, magic-link redirect chain
- `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — session restore flow, SecureStore usage pattern
- `apps/gatherly-mobile/app/api/users.ts` — `updateMe(name: string)` positional signature confirmed
- `apps/gatherly-mobile/app/api/events.ts` — `TEvent` with phase-annotated additions pattern
- `apps/api/src/routes/wishlists.ts` — atomic claim ON CONFLICT pattern (informs potluck race prevention)
- `apps/api/src/routes/modules.ts` — polls/rsvp route structure, plan tier enforcement pattern
- `apps/api/src/db/migrations/011-phase25-modules-polls-rsvp.sql` — migration template for Phase 1
- `apps/gatherly-mobile/screen-templates/Potluck/*.png` — authoritative potluck scope definition
- `apps/gatherly-mobile/screen-templates/Welcoming/*.png` — authoritative onboarding scope definition
- `apps/gatherly-mobile/screen-templates/Edit.png` — new event field UI spec

### Secondary (MEDIUM confidence — external research)

- [SignUpGenius Potluck](https://www.signupgenius.com/how-to-use/potluck), [PerfectPotluck](https://perfectpotluck.com/), [withlome](https://www.withlome.com/potluck-planner) — validated category/slot/quantity data model
- [NNGroup Mobile App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/) — component and technique baseline
- [Appcues Mobile Onboarding Best Practices](https://www.appcues.com/blog/mobile-onboarding-best-practices) — completion rates, slide count thresholds, permission timing
- [VWO Mobile App Onboarding Guide](https://vwo.com/blog/mobile-app-onboarding-guide/) — personalization timing, value-first approach
- Expo SDK 54 documentation — `expo-image`, `expo-haptics`, `react-native-pager-view` APIs and caching behavior

---

*Research completed: 2026-03-17*
*Ready for roadmap: yes*
