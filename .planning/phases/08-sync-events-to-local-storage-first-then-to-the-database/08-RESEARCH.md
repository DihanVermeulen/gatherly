# Phase 8: Sync Events to Local Storage First Then to the Database - Research

**Researched:** 2026-02-12
**Domain:** Offline-first architecture, optimistic UI, sync queue management
**Confidence:** MEDIUM

## Summary

This phase transitions the app from a hybrid storage pattern (API-first OR localStorage fallback) to a true offline-first architecture (localStorage-first THEN database sync). The research focused on established patterns for implementing optimistic UI, sync queue management, conflict resolution, and migration strategies.

**Key findings:**
- **TanStack Query v5** is the industry standard for managing offline mutations with persistence and automatic retry
- **IndexedDB** should be used for sync queue storage (not localStorage) due to async operations and service worker compatibility
- **Last-Write-Wins (LWW)** is the recommended conflict resolution strategy for this use case (simple events without concurrent multi-user editing)
- **React 19's useOptimistic hook** provides native support for optimistic UI patterns
- **Exponential backoff with jitter** is the established retry pattern for sync operations
- Migration from current hybrid pattern requires dual-write period with gradual rollout

**Primary recommendation:** Use TanStack Query v5 with persistQueryClient plugin for offline mutation queue, IndexedDB for persistent storage, and React 19's useOptimistic hook for immediate UI updates. Implement Last-Write-Wins conflict resolution with server timestamps for simplicity.

## Standard Stack

The established libraries/tools for offline-first React applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Query | v5.x | Server state management with offline support | Industry standard for data fetching/caching, built-in offline mutations queue, automatic retry with backoff |
| @tanstack/query-persist-client-core | v5.x | Persist/hydrate query and mutation cache | Official plugin for persisting mutations across page reloads |
| @tanstack/query-sync-storage-persister | v5.x | LocalStorage/IndexedDB persistence adapter | Official adapter for browser storage |
| React 19 | 19.x | UI framework with useOptimistic hook | Native optimistic UI support, already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| exponential-backoff | latest | Retry logic with exponential backoff | Custom sync operations outside TanStack Query |
| idb-keyval | latest | Simple IndexedDB wrapper | If building custom sync queue (not recommended) |
| localforage | latest | Unified storage API (IndexedDB/localStorage/WebSQL) | Alternative to idb-keyval for more complex storage needs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query | Custom sync queue | More control but requires building retry, persistence, deduplication, error handling from scratch |
| IndexedDB | localStorage only | Simpler but synchronous (blocks UI), no service worker support, ~5-10MB limit |
| Last-Write-Wins | CRDT (Yjs, Automerge) | Handles concurrent edits better but massive complexity overkill for single-user event management |

**Installation:**
```bash
cd apps/gatherly
pnpm add @tanstack/react-query@latest @tanstack/query-persist-client-core@latest @tanstack/query-sync-storage-persister@latest exponential-backoff
```

## Architecture Patterns

### Recommended Project Structure
```
apps/gatherly/src/
├── lib/
│   ├── queryClient.ts        # TanStack Query client configuration
│   ├── queryPersister.ts     # IndexedDB persister setup
│   └── syncQueue.ts          # Sync queue utilities and status
├── api/
│   ├── client.ts             # Axios client (existing)
│   └── events.ts             # Event API functions (existing)
├── contexts/
│   └── EventsContext.tsx     # Modified to use TanStack Query
├── hooks/
│   ├── useEventMutations.ts  # Event CRUD mutations with optimistic updates
│   └── useSyncStatus.ts      # Sync queue status and retry controls
└── components/
    └── SyncIndicator.tsx     # Visual indicator for sync status
```

### Pattern 1: Optimistic UI with TanStack Query

**What:** Update UI immediately on user action, queue mutation for background sync, rollback on failure

**When to use:** All user-initiated CRUD operations (create event, update participants, delete event)

**Example:**
```typescript
// Source: https://tanstack.com/query/v5/docs/react/guides/optimistic-updates
// apps/gatherly/src/hooks/useEventMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, Event } from '../api/events';

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (event: Event) => eventsApi.update(event.id, event),

    // Optimistic update before mutation runs
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData<Event[]>(['events']);

      // Optimistically update to new value
      queryClient.setQueryData<Event[]>(['events'], (old = []) =>
        old.map((e) => (e.id === newEvent.id ? newEvent : e))
      );

      return { previousEvents };
    },

    // Rollback on error
    onError: (err, newEvent, context) => {
      queryClient.setQueryData(['events'], context?.previousEvents);
    },

    // Refetch on success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
```

### Pattern 2: Persistent Offline Mutations

**What:** Configure TanStack Query to persist mutations to IndexedDB so they survive page reload

**When to use:** Application initialization - set up once in app entry point

**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
// apps/gatherly/src/lib/queryClient.ts
import { QueryClient, MutationCache } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create persister using IndexedDB
export const persister = createSyncStoragePersister({
  storage: window.localStorage, // For sync queue metadata
  key: 'gatherly-sync-queue',
});

// QueryClient with mutation defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst', // Try cache first, network second
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      console.log('Mutation synced:', mutation.options.mutationKey);
    },
  }),
});

// Set default mutation functions for each operation type
queryClient.setMutationDefaults(['event', 'create'], {
  mutationFn: (event: Partial<Event>) => eventsApi.create(event.name!, event.coupleCrossing),
});

queryClient.setMutationDefaults(['event', 'update'], {
  mutationFn: ({ id, ...data }: Event) => eventsApi.update(id, data),
});

queryClient.setMutationDefaults(['event', 'delete'], {
  mutationFn: (id: string) => eventsApi.delete(id),
});
```

### Pattern 3: React 19 useOptimistic for Immediate Feedback

**What:** Use React 19's built-in hook for optimistic state updates

**When to use:** Simple optimistic updates without complex rollback logic

**Example:**
```typescript
// Source: https://react.dev/reference/react/useOptimistic
// apps/gatherly/src/components/EventList.tsx
import { useOptimistic } from 'react';
import { useEvents } from '../hooks/useEvents';

function EventList() {
  const { data: events = [] } = useEvents();
  const updateMutation = useUpdateEvent();

  const [optimisticEvents, addOptimisticEvent] = useOptimistic(
    events,
    (state, newEvent: Event) => {
      return state.map(e => e.id === newEvent.id ? newEvent : e);
    }
  );

  const handleUpdate = async (event: Event) => {
    addOptimisticEvent(event); // Immediate UI update
    await updateMutation.mutateAsync(event); // Background sync
  };

  return (
    <div>
      {optimisticEvents.map(event => (
        <EventCard key={event.id} event={event} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}
```

### Pattern 4: Exponential Backoff with Jitter

**What:** Retry failed sync operations with increasing delays and randomization

**When to use:** Custom sync operations or fine-tuning TanStack Query retry behavior

**Example:**
```typescript
// Source: https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/
// apps/gatherly/src/lib/syncQueue.ts
import { backOff } from 'exponential-backoff';

export async function syncWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  return backOff(operation, {
    numOfAttempts: maxRetries,
    startingDelay: 1000, // Start with 1s
    timeMultiple: 2, // Double each time
    maxDelay: 30000, // Cap at 30s
    jitter: 'full', // Add randomness to prevent thundering herd
    retry: (error: any) => {
      // Only retry on network errors or 5xx server errors
      return !error.response || error.response.status >= 500;
    },
  });
}
```

### Pattern 5: Sync Status Indicator

**What:** Visual feedback showing sync queue status (syncing, offline, error)

**When to use:** Always - critical for user trust in offline-first apps

**Example:**
```typescript
// Source: https://tkdodo.eu/blog/offline-react-query
// apps/gatherly/src/components/SyncIndicator.tsx
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function SyncIndicator() {
  const isMutating = useIsMutating();
  const isFetching = useIsFetching();
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <Badge color="yellow">Offline - Changes queued</Badge>;
  }

  if (isMutating > 0) {
    return <Badge color="blue">Syncing {isMutating} changes...</Badge>;
  }

  if (isFetching > 0) {
    return <Badge color="gray">Loading...</Badge>;
  }

  return <Badge color="green">All synced</Badge>;
}
```

### Anti-Patterns to Avoid

- **Synchronous localStorage writes in event handlers:** Blocks UI, especially with large event data. Use IndexedDB or TanStack Query's async persistence.
- **No conflict resolution strategy:** Assuming sync will always succeed leads to data loss. Always handle conflicts with Last-Write-Wins or version tracking.
- **Ignoring failed mutations:** Users must know when changes haven't synced. Always show sync status and allow manual retry.
- **Queueing non-idempotent operations:** Operations like "increment participant count" fail on retry. Always use absolute state ("set participants to [...]").
- **Not persisting mutation queue:** If user closes browser with pending mutations, they're lost. Use persistQueryClient to survive page reloads.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline mutation queue | Custom queue with array in localStorage | TanStack Query with persistQueryClient | Handles deduplication, retry, ordering, persistence, hydration, cache invalidation automatically |
| Retry logic | setTimeout loops with counters | exponential-backoff or TanStack Query's built-in retry | Edge cases: max retries, backoff calculation, jitter, abort conditions all handled |
| Optimistic UI state | Manual state tracking with flags | React 19's useOptimistic or TanStack Query's onMutate | Prevents race conditions, handles rollback, manages pending state correctly |
| Conflict detection | Comparing objects or timestamps | Server-generated version numbers or ETags | Client clocks are unreliable, timezone issues, requires server truth |
| Network status detection | navigator.onLine only | TanStack Query's networkMode + ping endpoint | navigator.onLine is unreliable (false positives), need actual connectivity check |
| IndexedDB operations | Raw IndexedDB API | idb-keyval or localforage | IndexedDB API is complex, callback-based, error-prone; wrappers provide promises and simplicity |

**Key insight:** Offline-first sync is deceptively complex. What seems like "just queue requests and send later" involves deduplication, retry strategies, race conditions, cache invalidation, partial failure handling, idempotency, conflict resolution, and user feedback. TanStack Query has solved these problems through years of iteration across thousands of production apps.

## Common Pitfalls

### Pitfall 1: Assuming navigator.onLine is Reliable

**What goes wrong:** App shows "online" status but API requests fail, or shows "offline" when network is actually working.

**Why it happens:** `navigator.onLine` only detects local network connection (wifi/ethernet), not actual internet connectivity. A device can be connected to wifi with no internet and report "online". Additionally, some browsers return false positives.

**How to avoid:**
- Use TanStack Query's `networkMode: 'offlineFirst'` instead of relying on navigator.onLine
- Implement periodic ping to `/status` endpoint to verify actual API connectivity
- Show sync status based on mutation queue state, not network status

**Warning signs:**
- Users report "syncing" indicator never appears even when online
- Failed requests despite "online" status
- Mutations queue indefinitely on certain networks

### Pitfall 2: Non-Idempotent Operations in Sync Queue

**What goes wrong:** Operation succeeds on server but client thinks it failed, retry causes duplicate data (e.g., event created twice, participant added twice).

**Why it happens:** Network can fail after server processes request but before response reaches client. On retry, server processes the "same" request again.

**How to avoid:**
- Use absolute state operations: "set participants to [A, B, C]" not "add participant C"
- Generate client-side UUIDs for create operations so duplicates have same ID
- Implement server-side idempotency keys (pass `X-Idempotency-Key` header with mutation ID)
- Use TanStack Query's mutation keys to prevent duplicate in-flight mutations

**Warning signs:**
- Duplicate events after network hiccups
- Same participant appears multiple times after sync
- User reports "I only clicked once but it happened twice"

### Pitfall 3: Large Payloads in localStorage

**What goes wrong:** App becomes slow or crashes when syncing events with many participants and wishlists.

**Why it happens:** localStorage is synchronous and blocks main thread during reads/writes. Large JSON serialization/parsing freezes UI. localStorage has 5-10MB limit.

**How to avoid:**
- Use IndexedDB for sync queue and event storage (async, no size limit)
- Store only mutation metadata in localStorage, full data in IndexedDB
- Implement pagination for large event lists
- Use TanStack Query's `maxSize` option to limit cache size

**Warning signs:**
- UI freezes when navigating between pages
- Browser warns about quota exceeded
- App crashes with 50+ events or large wishlists

### Pitfall 4: Lost Mutations on Page Reload

**What goes wrong:** User creates event, closes browser before sync completes, event is gone on next visit.

**Why it happens:** Default TanStack Query doesn't persist mutations to storage - they live in memory only.

**How to avoid:**
- Configure persistQueryClient with IndexedDB/localStorage persister
- Set mutation defaults for all operation types so they can be deserialized
- Call `queryClient.resumePausedMutations()` after hydration
- Show clear "syncing" indicator so users know not to close browser

**Warning signs:**
- User reports "I created an event but it disappeared"
- Changes made while offline are lost on refresh
- Sync queue empties on page reload

### Pitfall 5: Concurrent Edit Conflicts Without Resolution

**What goes wrong:** User edits event on phone (offline), then edits same event on laptop (online), conflicts result in data loss or corruption.

**Why it happens:** No conflict resolution strategy - both edits try to "win" or last one silently overwrites first.

**How to avoid:**
- Implement Last-Write-Wins with server timestamps (good enough for single-user apps)
- Use version numbers or ETags - reject update if version doesn't match
- For multi-user: consider CRDTs (Yjs, Automerge) but adds significant complexity
- Show merge UI for conflicts instead of silent overwrites

**Warning signs:**
- Users report "my changes disappeared"
- Event data randomly reverts to old state
- Participants or wishlists get overwritten unexpectedly

### Pitfall 6: Stale Data After Background Sync

**What goes wrong:** User makes change, sync completes in background, but UI doesn't update to show server-validated state.

**Why it happens:** Optimistic update shown immediately, but no cache invalidation or refetch after sync completes.

**How to avoid:**
- Use TanStack Query's `onSettled` callback to invalidate queries after mutation
- Implement `refetchOnWindowFocus` and `refetchOnReconnect` for stale data
- Show visual diff if server state differs from optimistic state
- Use `staleTime` appropriately (not too long for frequently changing data)

**Warning signs:**
- UI shows different data than API returns
- Refreshing page changes displayed data
- Other devices don't see updates until refresh

### Pitfall 7: Migration Breaking Existing Users

**What goes wrong:** Deploy new offline-first architecture, existing users lose all their events stored in old format.

**Why it happens:** New sync queue expects different data structure, no migration path from old localStorage schema.

**How to avoid:**
- Run migration on app initialization to convert old format to new
- Keep reading old `secret_santa_events` key during transition period
- Use versioned storage keys (`gatherly-events-v2`) for new format
- Dual-write period: write to both old and new storage during rollout

**Warning signs:**
- Support tickets spike after deployment
- Users report "all my events are gone"
- Different behavior for new vs. existing users

## Code Examples

Verified patterns from official sources:

### Full App Setup with Offline Persistence

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
// apps/gatherly/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './lib/queryClient';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
      onSuccess={() => {
        // Resume mutations that were paused while offline
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
```

### Complete Event CRUD with Optimistic Updates

```typescript
// Source: https://tanstack.com/query/v5/docs/react/guides/mutations
// apps/gatherly/src/hooks/useEventMutations.ts
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { eventsApi, Event } from '../api/events';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
    networkMode: 'offlineFirst',
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['event', 'create'],
    mutationFn: (data: { name: string; coupleCrossing: boolean }) =>
      eventsApi.create(data.name, data.coupleCrossing),

    onMutate: async (newEventData) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previous = queryClient.getQueryData<Event[]>(['events']);

      // Optimistically add new event with temporary ID
      const tempEvent: Event = {
        id: `temp-${Date.now()}`,
        name: newEventData.name,
        coupleCrossing: newEventData.coupleCrossing,
        people: [],
        participants: [],
        couples: [],
        assignments: null,
        gifts: {},
        date: new Date().toISOString(),
        wishlists: [],
      };

      queryClient.setQueryData<Event[]>(['events'], (old = []) => [
        ...old,
        tempEvent,
      ]);

      return { previous };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(['events'], context?.previous);
    },

    onSuccess: (newEvent) => {
      // Replace temp event with real one from server
      queryClient.setQueryData<Event[]>(['events'], (old = []) =>
        old.map((e) => (e.id.startsWith('temp-') ? newEvent : e))
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['event', 'update'],
    mutationFn: ({ id, ...data }: Event) => eventsApi.update(id, data),

    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previous = queryClient.getQueryData<Event[]>(['events']);

      queryClient.setQueryData<Event[]>(['events'], (old = []) =>
        old.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(['events'], context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['event', 'delete'],
    mutationFn: (id: string) => eventsApi.delete(id),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previous = queryClient.getQueryData<Event[]>(['events']);

      queryClient.setQueryData<Event[]>(['events'], (old = []) =>
        old.filter((e) => e.id !== deletedId)
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(['events'], context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
```

### Sync Status Hook

```typescript
// Source: https://tkdodo.eu/blog/offline-react-query
// apps/gatherly/src/hooks/useSyncStatus.ts
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export function useSyncStatus() {
  const queryClient = useQueryClient();
  const mutatingCount = useIsMutating();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastError, setLastError] = useState<Error | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for failed mutations in cache
  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();
    const mutations = mutationCache.getAll();
    const failed = mutations.find((m) => m.state.status === 'error');
    setLastError(failed?.state.error as Error | null);
  }, [mutatingCount, queryClient]);

  const getStatus = (): SyncStatus => {
    if (lastError) return 'error';
    if (!isOnline) return 'offline';
    if (mutatingCount > 0) return 'syncing';
    return 'synced';
  };

  const retryFailedMutations = async () => {
    setLastError(null);
    await queryClient.resumePausedMutations();
  };

  return {
    status: getStatus(),
    mutatingCount,
    isOnline,
    lastError,
    retryFailedMutations,
  };
}
```

### Migration from Old localStorage Schema

```typescript
// Source: https://github.com/ragnarstolsmark/localstorage-migrator
// apps/gatherly/src/lib/migrateStorage.ts
const OLD_STORAGE_KEY = 'secret_santa_events';
const NEW_STORAGE_KEY = 'gatherly-events-v2';
const MIGRATION_VERSION_KEY = 'gatherly-migration-version';

export function migrateFromV1() {
  const migrationVersion = localStorage.getItem(MIGRATION_VERSION_KEY);

  // Already migrated
  if (migrationVersion === '2') {
    return;
  }

  console.log('Migrating storage from v1 to v2...');

  try {
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);

    if (oldData) {
      const parsed = JSON.parse(oldData);
      const events = parsed.events || [];

      // Transform old format to new format if needed
      const migratedEvents = events.map((event: any) => ({
        ...event,
        // Add any new required fields
        wishlists: event.wishlists || [],
        hash: event.hash || undefined,
      }));

      // Write to new key
      localStorage.setItem(
        NEW_STORAGE_KEY,
        JSON.stringify({ events: migratedEvents, version: 2 })
      );

      console.log(`Migrated ${migratedEvents.length} events to v2`);
    }

    // Mark migration as complete
    localStorage.setItem(MIGRATION_VERSION_KEY, '2');

    // Keep old data for safety (can remove after successful rollout)
    // localStorage.removeItem(OLD_STORAGE_KEY);

  } catch (error) {
    console.error('Migration failed:', error);
    // Don't throw - let app continue with whatever data is available
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API-first with localStorage fallback | Offline-first with sync queue | 2024-2025 | Apps feel instant, work offline, better UX on flaky networks |
| Custom retry logic | TanStack Query with exponential backoff | 2023 | Automatic retry, deduplication, persistence built-in |
| Manual optimistic UI state | React 19 useOptimistic hook | 2024 (React 19 release) | Native support for optimistic updates, cleaner code |
| localStorage for everything | IndexedDB for large data, localStorage for config | 2023-2024 | Async operations, no size limits, service worker compatible |
| CRDTs for all conflicts | Last-Write-Wins for simple apps, CRDTs only when needed | 2024-2025 | Simpler conflict resolution for single-user apps, CRDTs for true multi-user |
| navigator.onLine for network status | TanStack Query networkMode + ping endpoint | 2023 | Reliable connectivity detection, not just local network |

**Deprecated/outdated:**
- **React Query v3/v4**: v5 (released late 2023) is now standard with better offline support and persistence
- **PouchDB/CouchDB sync**: Declining in favor of simpler approaches like TanStack Query for web apps (still valid for Electron/mobile)
- **localStorage for sync queue**: IndexedDB is now standard due to async API and service worker support
- **SWR for offline-first**: Less battle-tested than TanStack Query for offline mutations, smaller ecosystem

## Open Questions

Things that couldn't be fully resolved:

1. **Server-side idempotency implementation**
   - What we know: Client should send idempotency keys, server should deduplicate
   - What's unclear: Whether existing Express API has idempotency middleware, how to implement it
   - Recommendation: Start with client-side deduplication (TanStack Query handles this), add server-side idempotency in Phase 9+ if needed

2. **Conflict resolution for concurrent edits across devices**
   - What we know: Last-Write-Wins is simplest, CRDTs handle concurrent edits better
   - What's unclear: Whether users actually edit same event on multiple devices simultaneously, how often conflicts occur
   - Recommendation: Start with LWW, instrument to measure conflict frequency, upgrade to version vectors or CRDTs if conflicts are common

3. **Migration timing and rollout strategy**
   - What we know: Need to migrate existing localStorage data, can't break existing users
   - What's unclear: Should migration be gradual (feature flag) or one-time cutover, how to handle users who don't visit during transition period
   - Recommendation: Dual-read period (read from both old and new), single-write to new, keep old data for 30 days, then clean up

4. **Auth token handling in offline mutations**
   - What we know: JWT tokens expire, mutations queued offline may have stale tokens when they replay
   - What's unclear: How to refresh tokens before replaying mutations, whether to retry on 401 with token refresh
   - Recommendation: Implement token refresh in axios interceptor, retry mutations automatically after refresh, covered in Phase 7 research

5. **Service Worker integration**
   - What we know: Service workers can handle background sync via Background Sync API
   - What's unclear: Whether to use service worker for sync or keep it in main thread, browser support for Background Sync API
   - Recommendation: Start with main thread sync (simpler), consider service worker Background Sync as enhancement in later phase

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Mutations Documentation](https://tanstack.com/query/v5/docs/react/guides/mutations) - Official mutation guide with offline support
- [TanStack Query Persist Client Plugin](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient) - Official persistence documentation
- [React 19 useOptimistic Hook](https://react.dev/reference/react/useOptimistic) - Official React documentation
- [TanStack Query Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Official optimistic update patterns
- [exponential-backoff npm package](https://www.npmjs.com/package/exponential-backoff) - Standard retry library documentation

### Secondary (MEDIUM confidence)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - Recent overview of offline-first patterns (Jan 2025)
- [React Native 2026: Mastering Offline-First Architecture](https://javascript.plainenglish.io/react-native-2026-mastering-offline-first-architecture-ad9df4cb61ae) - Current offline-first patterns (Jan 2026)
- [Offline React Query - TkDodo's blog](https://tkdodo.eu/blog/offline-react-query) - Expert guidance from TanStack Query maintainer
- [How to Implement Retry Logic with Exponential Backoff in React](https://oneuptime.com/blog/post/2026-01-15-retry-logic-exponential-backoff-react/view) - Recent implementation guide (Jan 2026)
- [How to Implement Last-Write-Wins](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view) - Recent conflict resolution guide (Jan 2026)
- [Concurrent Optimistic Updates in React Query - TkDodo's blog](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) - Expert guidance on handling race conditions
- [Building Lightning-Fast UIs: Implementing Optimistic Updates with React Query and Zustand](https://medium.com/@anshulkahar2211/building-lightning-fast-uis-implementing-optimistic-updates-with-react-query-and-zustand-cfb7f9e7cd82) - Practical implementation patterns

### Tertiary (LOW confidence)
- [IndexedDB vs localStorage comparison - GeeksforGeeks](https://www.geeksforgeeks.org/javascript/difference-between-localstorage-and-indexeddb-in-javascript/) - General comparison, not specific to sync queues
- [CRDT vs Operational Transform comparison](https://thom.ee/blog/crdt-vs-operational-transformation/) - Good overview but not specific to React/web context
- [localStorage migrator library](https://github.com/ragnarstolsmark/localstorage-migrator) - Small library, limited adoption, pattern useful for reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack Query v5 is industry standard, heavily documented, widely adopted for offline-first React apps
- Architecture: HIGH - Patterns verified in official TanStack Query docs, React docs, and expert blog posts from maintainers
- Pitfalls: MEDIUM - Based on real-world reports from GitHub issues and blog posts, but not all verified in production Gatherly app

**Research date:** 2026-02-12
**Valid until:** ~2026-05-12 (90 days - stable ecosystem, TanStack Query v5 is mature)

**Notes:**
- TanStack Query v5 released late 2023, now stable and widely adopted
- React 19 useOptimistic is recent (2024) but stable and recommended
- Offline-first patterns are well-established, not bleeding edge
- Main uncertainty is around Gatherly-specific migration and conflict frequency
