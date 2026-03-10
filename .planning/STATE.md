# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.1 — Phases 22-24 COMPLETE (Profile, Event Metadata, Invite Management, Pricing)

## Current Position

Phase: 22-24 of v2.1 (Profile + Event Metadata + Invite Management + Pricing)
Plan: 22-24 complete
Status: Complete
Last activity: 2026-03-09 — Phases 22-24 complete (14 files changed across backend + mobile)

Progress: [████████████████████] 100% — v2.1 Phases 22-24 all changes committed

## Performance Metrics

**Velocity:**
- Total plans completed: 37 (27 v2.0 + 10 v2.1)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v2.0 (1–10) | 27 | — | — |
| v2.1 Phase 11 | 2/2 | ~8m | ~4m |
| v2.1 Phase 12 | 2/2 | ~12m | ~6m |
| v2.1 Phase 13 | 2/2 | ~9m | ~4.5m |
| v2.1 Phase 14 | 2/2 | ~7m | ~3.5m |
| v2.1 Phase 15 | 2/2 | ~7m | ~3.5m |
| v2.1 Phase 17 | 2/2 | ~10m | ~5m |
| v2.1 Phase 19 | 4/4 | ~18m | ~4.5m |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- GlueStack UI over Konsta UI — already installed and scaffolded; Konsta was v2.0 plan
- Expo Router for navigation — file-based routing, matches React Router mental model
- Screen templates required before implementing any screen — if missing, ask user to create it
- apps/gatherly-mobile nested .git removed — monorepo pattern, parent repo tracks all files directly
- SecureStore for token persistence — accessToken + user JSON; refreshToken lives in HttpOnly cookie only
- signOutCallback pattern — client.ts interceptor calls AuthContext's signOut then router.replace on 401
- 2-arg signIn(accessToken, user) — no refreshToken in body (HttpOnly cookie pattern)
- Use `npm install --ignore-scripts` in gatherly-mobile — pnpm virtual store dir length mismatch; --ignore-scripts also needed to bypass @gluestack-ui/core broken postinstall hook that triggers from npm installs
- EventsProvider key={session ?? 'unauthenticated'} OUTSIDE Stack.Protected — React destroys/remounts on session change; key approach preferred over scoping inside Stack.Protected which breaks Expo Router screen registration (supersedes 19-04 decision)
- eventToDeleteId state pattern — store id before confirm dialog, dispatch after user confirmation
- Type aliases (Event/WishlistItem) in events.ts before eventsApi — prevents binding to global DOM Event type
- Filter pills derive Active/Planning from assignments field: null = Planning, non-null = Active
- eventIndex-for-hero-color: Use events.findIndex (not find) to get index for hero colour cycling — visual consistency between list and details
- Inline style for dynamic hex heroColor: NativeWind cannot use dynamic hex values as Tailwind className at runtime
- Assignment card has three states: null (not generated), empty array (no match), populated (has assignment, show toggle)
- Role badge shows Organizer only when name === user?.name AND user.role === organizer
- PUT /api/events/:id confirmed to accept couples field — deletes all existing couples and re-inserts full array (full-array-replace)
- Manage Exclusions save pattern: eventsApi.update(id, { couples }) then refreshEvents() then router.back()
- react-qr-code@2.0.18 installed in gatherly-mobile
- ActivityIndicator (not ButtonSpinner) in Pressable context — ButtonSpinner requires GlueStack Button parent context
- giftCount is local UI state only — not stored in TEvent, always initializes to 1
- Immediate save pattern for toggles: onValueChange calls API directly, no useEffect debounce
- getCodes returns Record<string,string> — always transform via Object.entries().map() to array
- removeParticipant takes participant name string, not numeric ID — backend route: DELETE /events/:id/participants/:name
- participantDetails-via-getById: eventsApi.getById(id) returns participantDetails; eventsApi.getAll() does NOT — always fetch via getById in wishlist screens for correct participantId
- BottomSheetTextInput for text inputs inside gorhom sheets — prevents keyboard overlap on Android
- wishlist optimistic-delete pattern: dispatch DELETE_WISHLIST_ITEM immediately, revert with SET_WISHLISTS + wishlistsApi.getAll() on API failure
- created_by_user_id on invites table (FK to users ON DELETE SET NULL) — enables organizer name in validate response; stored during invite creation via req.user.id
- pendingInvite module-level variable pattern — for transient session state that doesn't need to survive app restarts (not AsyncStorage)
- consumePendingInviteCode() atomic read-and-clear — prevents double redirect; called in _layout.tsx useEffect watching session
- 100ms setTimeout in post-auth join redirect — lets Stack.Protected navigation settle before router.replace('/join?token=...')
- JoinState machine pattern: 7-state union type + switch in renderContent() — explicit states prevent impossible UI combinations
- retryCount in validate effect deps: token doesn't change on retry, retryCount triggers re-fetch
- Double-call guard in handleJoin: if (joinState === 'joining') return — prevents concurrent join requests
- Comment-only for sign-in/register pending invite docs: unused imports cause TS errors; comments document flow
- expo-sqlite via npm --ignore-scripts — pnpm fails due to monorepo virtual store path length (consistent with existing gatherly-mobile install convention)
- async-storage pinned to 1.24.0 — version 1.24.1 was unpublished from npm registry; 1.24.0 is highest compatible
- No wishlist_items SQLite table — wishlists embedded in event JSON blob and cached implicitly via cacheEvents(); separate table is dead code
- SQLite singleton pattern: module-level let db = null in database.ts, repeated initDatabase() calls return same instance
- DatabaseProvider position: inside SessionProvider, outside RootLayoutNav — db available when EventsProvider (Plan 02) calls useDatabase()
- gift_count column in SQLite events table is always 0 — giftCount is local UI state, not in TEvent
- initDatabase() direct call in signOut — SessionProvider is outside DatabaseProvider; singleton pattern makes direct call safe and returns same instance
- clearCache called after SecureStore.deleteItemAsync but before state setters in signOut — ensures data cleared before UI reacts to null session
- isConnected !== false pattern for offline detection — null (NetInfo initializing) treated as online; only false triggers offline banner
- app.json YOUR_DOMAIN placeholder pattern — use literal "YOUR_DOMAIN" in associatedDomains and intentFilters host; replace with production domain (e.g., gatherly.app, no https://) before EAS Build
- bundleIdentifier and android package both "com.gatherly.gatherly" — must match AASA appID and assetlinks.json package_name
- autoVerify: true required on Android intentFilters — without it, Android shows disambiguation dialog instead of opening app directly
- Fragment wrapper for SafeAreaView children — avoids extra View in layout tree while allowing OfflineBanner + ThemeProvider as siblings
- networkMode: 'online' per-mutation (not via QueryClient defaults) — no central QueryClient config in codebase; added inline to each useMutation
- VideoModal triggerClassName prop pattern — caller owns button styling; modal component stays generic
- App store icons use inline SVG in page.tsx — lucide-react has no brand logos (Apple/Google)
- Hero plant image uses Unsplash URL with TODO comment — real brand asset replaces URL before launch
- App store buttons on web use href="#" and default state only — PLAY_INSTALLED badge in Download.png is a mockup artifact; JS cannot reliably detect app installation
- web /pricing is a coming-soon stub — no pricing structure decided yet; replace when plans are defined

### Roadmap Evolution

- Phase 19 added: Offline Storage Strategy — AsyncStorage → SQLite + SecureStore (read-only offline caching, no offline mutations, scoped to paid-feature model)
- Phase 19 COMPLETE: All 5 plans executed (SQLite foundation, EventsContext migration, offline UI + mutation blocking, sign-out state reset gap closure, key-based EventsProvider remount fix)
- Phase 20 added: Magic Link Redirect Website — hosted redirect page that routes magic link email URLs to the mobile app via deep link (if installed) or falls back to web redemption
- Phase 21 added: Gatherly Next.js Website — Next.js marketing site in apps/web with home page (feature showcase), download page, and magic link redirect page that opens the mobile app via Universal Links / App Links

### Pending Todos

- `.planning/todos/pending/2026-03-10-phase-26-planning.md` — Plan Phase 26 (Public Wishlist + Push Notifications + Groups)

### Blockers/Concerns

- Phase 18: Organizer Invite Management template MISSING — must request from user; backend endpoint may also be missing
- Existing dev databases need manual migration: ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

## Session Continuity

Last session: 2026-03-09 UTC
Stopped at: Phases 22-24 complete — profile screen, event metadata, invite management, price field
Resume file: None

Next step: Apply schema migration to dev database (ALTER TABLE statements in schema.sql). Continue with remaining phases or v2.1 milestone audit.
