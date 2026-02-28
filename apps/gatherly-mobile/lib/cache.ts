import type { SQLiteDatabase } from "expo-sqlite";
import type { TEvent } from "@/app/api/events";

/**
 * Persists an array of events to the SQLite cache.
 *
 * Uses INSERT OR REPLACE so re-runs are idempotent. Events that are no longer
 * in the provided array are deleted from the cache (keeps local cache in sync
 * with the API response).
 *
 * NOTE: Wishlists are embedded in the event JSON blob (event.wishlists array)
 * and are cached implicitly as part of the `data` column. There is no separate
 * wishlist table or wishlist-specific cache helpers.
 */
export async function cacheEvents(
  db: SQLiteDatabase,
  events: TEvent[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const now = Date.now();

    for (const event of events) {
      const participantCount = event.participants?.length ?? event.people?.length ?? 0;

      await db.runAsync(
        `INSERT OR REPLACE INTO events
           (id, name, date, participant_count, gift_count, data, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.name,
          event.date ?? null,
          participantCount,
          0, // giftCount is local UI state only — not stored in TEvent
          JSON.stringify(event),
          now,
        ]
      );
    }

    if (events.length > 0) {
      // Remove events that are no longer in the server response
      const ids = events.map((e) => e.id);
      const placeholders = ids.map(() => "?").join(", ");
      await db.runAsync(
        `DELETE FROM events WHERE id NOT IN (${placeholders})`,
        ids
      );
    } else {
      // No events returned from server — clear the cache entirely
      await db.runAsync("DELETE FROM events");
    }
  });
}

/**
 * Loads all cached events from SQLite, ordered by most recently cached first.
 * Returns an empty array if the cache is empty.
 */
export async function loadCachedEvents(db: SQLiteDatabase): Promise<TEvent[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM events ORDER BY cached_at DESC"
  );

  return rows.map((row) => JSON.parse(row.data) as TEvent);
}

/**
 * Clears all cached data from the database.
 * Call this on logout to remove stale user data.
 */
export async function clearCache(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM events");
    await db.runAsync("DELETE FROM cache_meta");
  });
}
