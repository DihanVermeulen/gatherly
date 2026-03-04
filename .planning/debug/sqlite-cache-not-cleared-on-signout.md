---
status: resolved
trigger: "Investigate why the SQLite cache is NOT being cleared on sign-out in the gatherly-mobile React Native app."
created: 2026-03-02T00:00:00Z
updated: 2026-03-02T00:00:00Z
---

## Current Focus

hypothesis: confirmed — three distinct root causes found
test: static code analysis of all relevant files
expecting: N/A — resolution complete
next_action: report findings

## Symptoms

expected: Signing out clears the SQLite event cache. Signing in with a different account loads fresh data.
actual: After sign-out, the SQLite cache is NOT cleared. When a different account signs in, the previous account's cached events are displayed.
errors: none (silent failure)
reproduction: sign in as user A, load events, sign out, sign in as user B — user B sees user A's events
started: Phase 19 implementation

## Eliminated

- hypothesis: clearCache() not called at all in signOut
  evidence: AuthContext.tsx line 86-90 calls initDatabase() then clearCache(db) inside a try/catch
  timestamp: 2026-03-02

- hypothesis: clearCache() SQL is wrong (wrong table names or no-op DELETE)
  evidence: cache.ts lines 72-77 correctly issues DELETE FROM events and DELETE FROM cache_meta inside withTransactionAsync — the SQL itself is correct
  timestamp: 2026-03-02

- hypothesis: initDatabase() returns wrong instance
  evidence: database.ts singleton pattern is correct — module-level `db` variable, same instance returned every time
  timestamp: 2026-03-02

## Evidence

- timestamp: 2026-03-02
  checked: app/_layout.tsx lines 18-19, 41-46, 82
  found: _layout.tsx imports EventsProvider from "./contexts/EventsContext" (the app-local file at app/contexts/EventsContext.tsx). EventsProvider is rendered INSIDE RootLayoutNav, which is rendered INSIDE SessionProvider > DatabaseProvider.
  implication: The EventsProvider in use is app/contexts/EventsContext.tsx, NOT contexts/EventsContext.tsx (the TanStack Query version).

- timestamp: 2026-03-02
  checked: app/contexts/EventsContext.tsx lines 162-174
  found: On mount, EventsProvider calls loadCachedEvents(db) unconditionally and dispatches SET_EVENTS with whatever rows are in SQLite. There is NO guard for whether a user session exists or whether the previous cache belonged to a different user.
  implication: Every time EventsProvider mounts, it immediately reads the cache and populates state — even if clearCache was called during signOut. The cache read races with (or follows) the clear.

- timestamp: 2026-03-02
  checked: _layout.tsx lines 49-82 (RootLayoutNav component)
  found: EventsProvider is rendered INSIDE RootLayoutNav, which only renders when isLoading is false (line 78: `if (isLoading) return null`). But EventsProvider is NOT conditionally mounted based on session presence — it mounts once and stays mounted for the lifetime of the app, regardless of sign-in/sign-out state.
  implication: EventsProvider is a persistent singleton. Its mount-time useEffect (loadCachedEvents) fires once at app start, not again on sign-in. On sign-out + sign-in, the EventsProvider is never re-mounted, so loadCachedEvents is never re-run from cache. However, the in-memory state (from the old user's events) is NEVER reset to []. The reducer state persists across sign-out with the previous user's events in memory.

- timestamp: 2026-03-02
  checked: AuthContext.tsx signOut lines 76-94
  found: signOut calls clearCache(db) AFTER SecureStore cleanup. There is no dispatch or callback into EventsContext to reset its in-memory events state (dispatch SET_EVENTS with []). EventsContext has no subscription to auth state.
  implication: Even if clearCache succeeds on the SQLite side, the in-memory events array in EventsContext still holds the old user's events. When the new user signs in, EventsProvider never resets its state, so the stale events remain visible immediately.

- timestamp: 2026-03-02
  checked: app/contexts/EventsContext.tsx lines 177-195 (checkApi useEffect)
  found: The API fetch useEffect also fires once on mount with dep [db]. It fetches events and dispatches SET_EVENTS. This would eventually overwrite stale data — but only AFTER the network round-trip completes. During that window, stale events are shown.
  implication: Even if in-memory reset is the only concern, there is a visible flash of the old user's events before the API fetch completes.

- timestamp: 2026-03-02
  checked: app/contexts/EventsContext.tsx lines 162-174 (loadFromStorage useEffect) timing relative to signOut clearCache
  found: signOut clears the DB synchronously-awaited before setSession(null). setSession(null) triggers a re-render. RootLayoutNav does NOT unmount/remount EventsProvider on session change, so the loadCachedEvents useEffect does NOT re-run. Therefore the cache clear is actually irrelevant to what the new user sees in the UI — the in-memory state is what matters, and it is never reset.
  implication: ROOT CAUSE 1 confirmed — the in-memory events state is never cleared on sign-out. The SQLite clear does run successfully, but it does not help because the UI reads from in-memory state, not SQLite, after initial mount.

## Resolution

root_cause: |
  Three layered failures combine to cause the symptom:

  ROOT CAUSE 1 (PRIMARY — app/contexts/EventsContext.tsx, all of it):
  EventsProvider is mounted once and never re-mounted across sign-out/sign-in.
  Its in-memory `state.events` (held in useReducer) is NEVER reset to [] on sign-out.
  There is no mechanism for signOut in AuthContext to tell EventsContext to clear its
  state. When a new user signs in, EventsProvider still holds the previous user's events
  in memory and displays them immediately — before any API fetch completes.

  ROOT CAUSE 2 (SECONDARY — AuthContext.tsx signOut, line 84-90):
  Even though clearCache(db) is correctly called, it only clears SQLite rows.
  There is no dispatch to EventsContext to reset in-memory state.
  The SQLite clear is a correct but insufficient action — it prevents the cache
  from persisting across app restarts, but does nothing about the live in-memory state.

  ROOT CAUSE 3 (TERTIARY — _layout.tsx, EventsProvider placement):
  EventsProvider is rendered inside RootLayoutNav which is rendered unconditionally
  (once isLoading=false). It is not scoped to the authenticated subtree
  (Stack.Protected guard={!!session}). Even if EventsProvider were re-mounted on
  session change, the current tree structure would not cause that re-mount.

fix: not applied (diagnosis-only mode)
verification: not applied
files_changed: []
