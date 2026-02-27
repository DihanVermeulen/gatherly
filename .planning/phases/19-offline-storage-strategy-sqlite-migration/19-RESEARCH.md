# Phase 19: Offline Storage Strategy — AsyncStorage → SQLite + SecureStore - Research

**Researched:** 2026-02-27
**Domain:** Expo mobile storage — expo-sqlite, expo-sqlite/kv-store, expo-secure-store, TanStack Query offline caching
**Confidence:** HIGH

---

## Summary

This phase migrates the Gatherly mobile app from `@react-native-async-storage/async-storage` to `expo-sqlite/kv-store`, removes the stale offline-create-event fallback path, and defines a clean offline scope (read-only cache, no mutations without connectivity). Auth token persistence via `expo-secure-store` is already complete and needs no changes.

The active EventsContext (`app/contexts/EventsContext.tsx`) still uses `AsyncStorage` directly for event caching and exposes a `useApi` flag that models "API available vs. offline fallback" — the root of the online/offline confusion. The newer TanStack Query-backed context (`contexts/EventsContext.tsx` at repo root) is written but **not imported anywhere**; it is dead code. The live app uses the old reducer-based context.

The migration path is straightforward: `expo-sqlite/kv-store` is a verified drop-in AsyncStorage replacement (same API, change the import), already bundled with `expo-sqlite` (no new dependency needed), fully supported in Expo Go for SDK 54, and backed by SQLite instead of the deprecated AsyncStorage bridge.

**Primary recommendation:** Replace `@react-native-async-storage/async-storage` with `expo-sqlite/kv-store` in `app/contexts/EventsContext.tsx`, enforce API-required semantics (remove offline create/fallback logic), and delete the dead contexts at `contexts/` root.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-sqlite | ~16.0.x (SDK 54) | SQLite database + kv-store subpath | Ships with Expo SDK 54; Expo Go supported; replaces AsyncStorage |
| expo-secure-store | ~15.0.8 | Encrypted key-value store for secrets | Already in use for auth tokens; correct tool for sensitive data |
| @tanstack/react-query | ^5.90.21 | Server state caching + offline-first | Already in project; in-memory cache survives navigations |

### Not Needed (Avoid Adding)

| Library | Why to Skip |
|---------|-------------|
| expo-sqlite full SQLiteProvider | Overkill for pure caching — kv-store is the right abstraction |
| @tanstack/query-async-storage-persister | Persisting the full TanStack query cache to disk adds complexity with no benefit given the simple read-only cache goal |
| Drizzle ORM | Schema migration management for a cache layer is over-engineered |

### Why expo-sqlite/kv-store Over Raw SQLite

The `expo-sqlite/kv-store` subpath export is a fully SQLite-backed key-value store with the **identical API** as `@react-native-async-storage/async-storage`. Migration is one import change. There is no schema to design, no SQL to write, no migration runner needed. This is exactly what AsyncStorage was used for (serialised JSON blob per key).

**Installation:**
```bash
# expo-sqlite is already a peer dep via SDK 54; just install it:
npx expo install expo-sqlite
# Remove the old dependency:
npm uninstall @react-native-async-storage/async-storage
```

---

## Architecture Patterns

### What Exists Today (Active Code)

```
app/
  contexts/
    AuthContext.tsx       ← ACTIVE: already uses expo-secure-store correctly
    EventsContext.tsx     ← ACTIVE: uses AsyncStorage — THIS is what changes

contexts/                 ← ROOT-LEVEL: dead code, never imported by app routes
  AuthContext.tsx         ← OLD (no SecureStore)
  EventsContext.tsx       ← OLD (TanStack Query wrapper, never wired up)
  GiftsContext.tsx        ← OLD (uses localStorage — web only, irrelevant)
```

The root `contexts/` directory was the previous iteration before `app/contexts/` was created. Nothing in the `app/` directory imports from root `contexts/`. This directory should be deleted.

### Active EventsContext: What It Does

`app/contexts/EventsContext.tsx` (lines 151–224):

1. On mount, reads serialised events JSON from `AsyncStorage` key `"secret_santa_events"`.
2. On mount, calls `/status` API; if reachable sets `useApi = true` and fetches live events, writes them back to AsyncStorage.
3. `refreshEvents()` fetches from API and writes to AsyncStorage.
4. If API is unreachable, falls back silently to cached data and allows mutating state in-memory (which is then lost on restart).

**The offline fallback path for mutations is the specific thing to remove** — see "Offline Scope" section.

### Recommended Pattern After Migration

```typescript
// app/contexts/EventsContext.tsx (after migration)
import AsyncStorage from "expo-sqlite/kv-store"; // ← ONE LINE CHANGE

// Everything else stays identical: same STORAGE_KEY, same getItem/setItem calls
```

The rest of the file (reducer, provider, `useApi` flag, `refreshEvents`) does not change in this phase. The only code changes are:

1. Replace the `@react-native-async-storage/async-storage` import with `expo-sqlite/kv-store`.
2. Remove the "API not available, using cached data" branch from `checkApi` — if the API is down, show an error instead of silently falling through to a read-only stale cache.
3. Remove any code paths that allow creating/editing/deleting events when `useApi === false`.
4. Delete the root `contexts/` directory.

### Offline Scope Decision

**Read (offline allowed):**
- Displaying previously cached events list (last successful fetch)
- Displaying cached wishlist items per event

**Write (requires API — must show error or disable UI if offline):**
- Create event → API required (it's a paid feature path)
- Edit event → API required
- Delete event → API required
- Add/edit/delete wishlist item → API required
- Claim/unclaim wishlist item → API required

The current `app/(tabs)/index.tsx` `handleDeleteConfirmed` already demonstrates the bug: it calls `dispatch({ type: "DELETE_EVENT", ... })` regardless of API success/failure (line 98-99). The dispatch happens after the try/catch, so a failed API call still removes the event from state. This must be fixed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite-backed KV store | Custom SQLite schema + DAO layer | `expo-sqlite/kv-store` | Already built; same API as AsyncStorage; zero new code |
| Secure token storage | Custom encryption | `expo-secure-store` | Already in use; hardware-backed; keychain/keystore integration |
| In-memory query cache | Redux/useReducer with manual invalidation | TanStack Query (already in `hooks/`) | Already set up; handles stale/fresh/refetch automatically |
| Offline detection | Custom `useNetInfo` hook | TanStack Query `networkMode: "offlineFirst"` | TanStack Query pauses queries automatically when offline |

**Key insight:** The app already has TanStack Query wired up in `hooks/useEventQueries.ts` and `hooks/useEventMutations.ts` with `networkMode: "offlineFirst"` — but there is **no `QueryClientProvider` in `_layout.tsx`**. The hooks exist but are never called because `contexts/EventsContext.tsx` (the TanStack Query version) is dead code. Phase 19 should NOT silently wire in the TanStack Query context; that is a separate architectural change beyond what this phase describes. Phase 19's scope is the storage swap.

---

## Common Pitfalls

### Pitfall 1: Thinking expo-sqlite Requires Schema Design

**What goes wrong:** Developer spends time designing `events` and `wishlists` tables, writing CREATE TABLE migrations, writing SELECT/INSERT/UPDATE SQL.
**Why it happens:** Conflating "expo-sqlite" with "structured SQLite database." The phase goal is just a cache of JSON blobs.
**How to avoid:** Use `expo-sqlite/kv-store`. It handles schema internally. You just call `setItem(key, JSON.stringify(data))`.
**Warning signs:** Any PR that contains `CREATE TABLE`, `runAsync`, `getAllAsync`, or `SQLiteProvider` in `app/contexts/`.

### Pitfall 2: The Delete Bug — Dispatch After Failed API Call

**What goes wrong:** `handleDeleteConfirmed` in `app/(tabs)/index.tsx` calls `dispatch({ type: "DELETE_EVENT", ... })` unconditionally on line 99, outside the try block. A failed API call still removes the event from in-memory state.
**Why it happens:** The dispatch was placed after the try/catch intentionally in the old "hybrid storage" model where deleting from local state was always valid. That model is being removed.
**How to avoid:** In Phase 19, move the dispatch inside the `if (useApi)` success path. On API failure, show an error toast and leave the event visible.
**Warning signs:** DELETE_EVENT dispatch not inside the `.then()` or try block success path.

### Pitfall 3: Stale useApi Flag on First Load

**What goes wrong:** `checkApi` in the EventsContext closes over the initial `useApi = false`. When it calls `setUseApi(true)` and then uses `useApi` in the same closure, it reads `false`.
**Why it happens:** React `useState` closures capture the value at the time the effect runs.
**How to avoid:** The current code already handles this correctly by NOT calling `refreshEvents()` but instead loading directly in `checkApi`. This comment exists in the code (`// Load directly here — don't call refreshEvents() which reads stale useApi state`). Preserve this pattern.
**Warning signs:** Calling `refreshEvents()` from within `checkApi`.

### Pitfall 4: expo-sqlite/kv-store Not Available in Expo SDK < 50

**What goes wrong:** Developer checks npm and finds that `expo-sqlite/kv-store` is a subpath export that was only added in SDK 50+.
**Why it happens:** Older docs examples use the raw SQLite API.
**How to avoid:** This project uses SDK 54. The subpath export is confirmed available. Do not add any compatibility shims.

### Pitfall 5: Leaving Root contexts/ Directory

**What goes wrong:** Root `contexts/EventsContext.tsx` (TanStack Query wrapper) and `contexts/AuthContext.tsx` (no SecureStore) survive and confuse future developers.
**Why it happens:** They are never imported so linters don't flag them.
**How to avoid:** Delete `contexts/` directory explicitly as part of Phase 19 cleanup.
**Warning signs:** `contexts/` directory still present after PR merge.

### Pitfall 6: Removing useApi Flag Prematurely

**What goes wrong:** Developer removes `useApi` from the EventsContext because "we require API now," breaking screens that read `useApi` to decide whether to show certain UI (e.g., create button).
**Why it happens:** The flag is used in `app/(tabs)/index.tsx` to gate the delete path.
**How to avoid:** In Phase 19, keep `useApi` but change its semantics: instead of "API is available for reading," it becomes "API was reachable on last check." Screens can still use it to show an offline banner. Remove only the mutation-fallback paths, not the flag itself.

---

## Code Examples

### Drop-in Import Replacement (HIGH confidence — official docs)

```typescript
// Before (in app/contexts/EventsContext.tsx):
import AsyncStorage from "@react-native-async-storage/async-storage";

// After (exact drop-in, same API):
import AsyncStorage from "expo-sqlite/kv-store";

// Usage unchanged:
const saved = await AsyncStorage.getItem(STORAGE_KEY);
await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
```

Source: [expo-sqlite docs SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/)

### SQLiteProvider + onInit (if structured SQLite is ever needed — HIGH confidence)

```typescript
// Source: Expo official docs
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `);
    await db.runAsync("PRAGMA user_version = 1");
  }
}

// In _layout.tsx (only if using structured SQLite, NOT needed for kv-store):
<SQLiteProvider databaseName="gatherly.db" onInit={migrateDbIfNeeded}>
  {children}
</SQLiteProvider>
```

**Note:** This pattern is NOT needed for Phase 19. The kv-store abstraction handles all of this internally. Provided for reference only.

### Correct Delete Handler Pattern (fixes the existing bug)

```typescript
// BEFORE (buggy — dispatches even on API failure):
const handleDeleteConfirmed = useCallback(async () => {
  if (eventToDeleteId === null) return;
  try {
    if (useApi) {
      await eventsApi.delete(eventToDeleteId);
    }
  } catch (error) {
    console.error("Failed to delete event via API:", error);
  }
  dispatch({ type: "DELETE_EVENT", payload: eventToDeleteId }); // always runs!
  setIsDeleteAlertOpen(false);
  setEventToDeleteId(null);
}, [eventToDeleteId, useApi, dispatch]);

// AFTER (correct — dispatch only on success, show error on failure):
const handleDeleteConfirmed = useCallback(async () => {
  if (eventToDeleteId === null) return;
  try {
    await eventsApi.delete(eventToDeleteId);
    dispatch({ type: "DELETE_EVENT", payload: eventToDeleteId });
    setIsDeleteAlertOpen(false);
    setEventToDeleteId(null);
  } catch (error) {
    console.error("Failed to delete event via API:", error);
    setIsDeleteAlertOpen(false);
    setEventToDeleteId(null);
    // Show error toast here
  }
}, [eventToDeleteId, dispatch]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-native-async-storage/async-storage` | `expo-sqlite/kv-store` | SDK 50+ | Drop-in; backed by SQLite not deprecated bridge |
| Custom SQL + schema for caching | kv-store JSON blobs | SDK 50+ | No schema design needed for simple caching |
| AsyncStorage for auth tokens | `expo-secure-store` | SDK 46+ | Hardware-backed encryption |
| Manual offline detection | TanStack Query `networkMode` | v5 | Automatic query pausing when offline |

**Deprecated:**
- `@react-native-async-storage/async-storage`: Still works but is no longer the Expo-recommended path when `expo-sqlite` is already in the project. The AsyncStorage bridge has had known performance problems with large datasets.

---

## Current AsyncStorage Usage Audit

Only one file in the live app imports AsyncStorage:

**`apps/gatherly-mobile/app/contexts/EventsContext.tsx`**

| Line | Usage | Action |
|------|-------|--------|
| 1 | `import AsyncStorage from "@react-native-async-storage/async-storage"` | Change to `expo-sqlite/kv-store` |
| 164 | `AsyncStorage.getItem(STORAGE_KEY)` | No change needed — same API |
| 192–195 | `AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ events }))` | No change needed — same API |
| 211 | `AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ events }))` | No change needed — same API |

The `STORAGE_KEY = "secret_santa_events"` constant remains unchanged. SQLite kv-store uses the same key-value semantics.

**No other files import AsyncStorage.** The `app/utils/pendingInvite.ts` file explicitly uses a module-level variable instead of AsyncStorage (intentionally, for session-only storage — leave as-is).

---

## Bugs in Current EventsContext to Fix in This Phase

### Bug 1: Delete dispatches regardless of API failure

**File:** `apps/gatherly-mobile/app/(tabs)/index.tsx` lines 90-102
**Problem:** `dispatch({ type: "DELETE_EVENT", payload: eventToDeleteId })` is called unconditionally after the try/catch. A network error causes the event to disappear from the UI but remain in the database.
**Fix:** Move dispatch inside the try block success path.

### Bug 2: No user-facing feedback when API is unreachable

**File:** `apps/gatherly-mobile/app/contexts/EventsContext.tsx` lines 197-199
**Problem:** `console.log("API not available, using cached data")` silently falls through. Users see stale data with no indication the app is offline.
**Fix:** Set an error state or banner when `checkApi` fails. Phase 19 should introduce an offline banner rather than silent fallback.

### Bug 3: Offline mutation creation has no guardrail

**File:** `apps/gatherly-mobile/app/(tabs)/index.tsx` lines 92-98
**Problem:** When `useApi === false`, the delete API call is skipped but dispatch still runs (Bug 1). Similarly, creating events when `useApi === false` adds a temp event to state that will be lost on restart.
**Fix:** When `useApi === false`, disable mutation UI (create/delete/edit buttons) or show an "offline — reconnect to modify events" message.

### Bug 4: refreshEvents silently swallows errors then sets useApi=false

**File:** `apps/gatherly-mobile/app/contexts/EventsContext.tsx` lines 206-217
**Problem:** On any error (network or parsing), `setUseApi(false)` is called. This means a transient 500 error from the server permanently disables API mode for the session.
**Fix:** Only set `useApi = false` on network connectivity errors, not server errors.

---

## Dead Code to Remove

| File/Directory | Reason |
|----------------|--------|
| `contexts/EventsContext.tsx` (root level) | Never imported; TanStack Query wrapper that was never wired up |
| `contexts/AuthContext.tsx` (root level) | Never imported; old version without SecureStore |
| `contexts/GiftsContext.tsx` (root level) | Uses `localStorage` (web); never imported in mobile app routes |
| `contexts/` directory | Entire directory is dead |
| `useApi === false` mutation branches in `app/(tabs)/index.tsx` | Phase 19 makes API required for all writes |

---

## Open Questions

1. **Should `refreshEvents` set `useApi = false` on 401/403?**
   - What we know: AuthContext already handles 401s via the axios interceptor (sign out). So EventsContext `refreshEvents` catching a 401 means the user has been signed out already.
   - What's unclear: Should EventsContext know about auth state at all?
   - Recommendation: Remove `setUseApi(false)` from `refreshEvents` error handler entirely. Let the axios interceptor handle auth errors.

2. **What cache TTL should be used for the offline cache?**
   - What we know: Events change infrequently. The current model caches indefinitely (until next API fetch).
   - What's unclear: Whether to show "cached X minutes ago" UI.
   - Recommendation: Keep indefinite cache (show on success + timestamp is a Phase 20 concern). Phase 19 focuses on storage correctness, not freshness policy.

3. **Should the `useApi` flag be renamed to `isOnline` or `isConnected`?**
   - What we know: The flag currently means "API was reachable on last mount check." With Phase 19, it should mean "mutations are allowed."
   - Recommendation: Rename to `canMutate` or add a separate `isApiConnected` flag. Not a blocker for Phase 19 but worth noting for the planner.

---

## Sources

### Primary (HIGH confidence)
- [expo-sqlite SDK 54 official docs](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) — SQLiteProvider API, useSQLiteContext, kv-store subpath, Expo Go support confirmed
- [expo-sqlite/kv-store Storage.ts source](https://github.com/expo/expo/blob/main/packages/expo-sqlite/src/Storage.ts) — Full API surface, AsyncStorage drop-in confirmed
- Direct codebase audit — `app/contexts/EventsContext.tsx`, `app/(tabs)/index.tsx`, `app/contexts/AuthContext.tsx`, `contexts/` root directory

### Secondary (MEDIUM confidence)
- [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) — localStorage API added, Apple TV support, sqlite-vec extension; expo-sqlite 16.0.x confirmed for SDK 54
- [Expo store data guide](https://docs.expo.dev/develop/user-interface/store-data/) — Storage decision matrix (SecureStore vs SQLite vs AsyncStorage)

### Tertiary (LOW confidence)
- [Medium: Methods of Storing Local Data in Expo](https://dev.to/snehasishkonger/methods-of-storing-local-data-in-react-native-expo-mc0) — Community comparison of storage options (unverified)

---

## Metadata

**Confidence breakdown:**
- AsyncStorage usage audit: HIGH — direct file reads
- expo-sqlite/kv-store API: HIGH — official docs + source code
- Drop-in replacement claim: HIGH — official docs explicitly state it
- Expo Go compatibility: HIGH — official docs list "Included in Expo Go"
- Dead code identification (root contexts/): HIGH — grep confirmed no imports
- Bug identification: HIGH — direct code reading
- TanStack Query persister approach: NOT RECOMMENDED for this phase (out of scope)

**Research date:** 2026-02-27
**Valid until:** 2026-05-27 (expo-sqlite API is stable; SDK 55 is available but project is on 54)
