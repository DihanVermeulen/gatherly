# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.
**Current focus:** v2.1 — Phase 19 COMPLETE (offline storage SQLite migration + gap closure)

## Current Position

Phase: 19 of 19 (Offline Storage Strategy — SQLite Migration) — COMPLETE
Plan: 4 of 4 complete (19-01, 19-02, 19-03, 19-04 done)
Status: Phase 19 gap closure complete — all v2.1 phases complete
Last activity: 2026-03-03 — Completed 19-04-PLAN.md (sign-out state reset — EventsProvider scoped inside auth guard)

Progress: [████████████████████] ~100% — v2.1 Phase 19 all 4 plans complete

## Performance Metrics

**Velocity:**
- Total plans completed: 36 (27 v2.0 + 9 v2.1)
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
- EventsProvider scoped inside Stack.Protected guard={!!session} — mounts fresh on each login, unmounts on sign-out, resetting in-memory state (supersedes prior decision about wrapping full Stack)
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
- Fragment wrapper for SafeAreaView children — avoids extra View in layout tree while allowing OfflineBanner + ThemeProvider as siblings
- networkMode: 'online' per-mutation (not via QueryClient defaults) — no central QueryClient config in codebase; added inline to each useMutation

### Roadmap Evolution

- Phase 19 added: Offline Storage Strategy — AsyncStorage → SQLite + SecureStore (read-only offline caching, no offline mutations, scoped to paid-feature model)
- Phase 19 COMPLETE: All 4 plans executed (SQLite foundation, EventsContext migration, offline UI + mutation blocking, sign-out state reset gap closure)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 18: Organizer Invite Management template MISSING — must request from user; backend endpoint may also be missing
- Existing dev databases need manual migration: ALTER TABLE invites ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

## Session Continuity

Last session: 2026-03-03 08:00 UTC
Stopped at: Completed 19-04-PLAN.md — EventsProvider scoped inside auth guard — Phase 19 gap closure COMPLETE
Resume file: None

Next step: All planned phases complete. Phase 18 (Organizer Invite Management) skipped — template missing.
