import type { SQLiteDatabase } from "expo-sqlite";
import type { TEvent } from "@/app/api/events";

/**
 * Persists an array of events to the SQLite cache for the given user.
 *
 * Uses INSERT OR REPLACE so re-runs are idempotent. Events that are no longer
 * in the provided array (for this user) are deleted from the cache.
 *
 * NOTE: Wishlists are embedded in the event JSON blob (event.wishlists array)
 * and are cached implicitly as part of the `data` column. There is no separate
 * wishlist table or wishlist-specific cache helpers.
 */
export async function cacheEvents(
  db: SQLiteDatabase,
  events: TEvent[],
  userId?: string
): Promise<void> {
  const now = Date.now();

  for (const event of events) {
    const participantCount = event.participants?.length ?? event.people?.length ?? 0;

    await db.runAsync(
      `INSERT OR REPLACE INTO events
         (id, name, date, participant_count, gift_count, data, cached_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.name,
        event.date ?? null,
        participantCount,
        0, // giftCount is local UI state only — not stored in TEvent
        JSON.stringify(event),
        now,
        userId ?? null,
      ]
    );
  }

  if (events.length > 0) {
    // Remove events for this user that are no longer in the server response
    const ids = events.map((e) => e.id);
    const placeholders = ids.map(() => "?").join(", ");
    if (userId) {
      await db.runAsync(
        `DELETE FROM events WHERE user_id = ? AND id NOT IN (${placeholders})`,
        [userId, ...ids]
      );
    } else {
      await db.runAsync(
        `DELETE FROM events WHERE id NOT IN (${placeholders})`,
        ids
      );
    }
  } else {
    // No events returned from server — clear the cache for this user
    if (userId) {
      await db.runAsync("DELETE FROM events WHERE user_id = ?", [userId]);
    } else {
      await db.runAsync("DELETE FROM events");
    }
  }
}

/**
 * Loads all cached events from SQLite for the given user, ordered by most
 * recently cached first. Pass userId to filter to that user's events only.
 * Returns an empty array if the cache is empty.
 */
export async function loadCachedEvents(
  db: SQLiteDatabase,
  userId?: string
): Promise<TEvent[]> {
  const rows = userId
    ? await db.getAllAsync<{ data: string }>(
        "SELECT data FROM events WHERE user_id = ? ORDER BY cached_at DESC",
        [userId]
      )
    : await db.getAllAsync<{ data: string }>(
        "SELECT data FROM events ORDER BY cached_at DESC"
      );

  return rows.map((row) => JSON.parse(row.data) as TEvent);
}

/**
 * Clears all cached data from the database.
 * Uses runAsync directly (no withTransactionAsync) to avoid lock conflicts
 * when called concurrently with other cache operations.
 */
export async function clearCache(db: SQLiteDatabase): Promise<void> {
  await db.runAsync("DELETE FROM events");
  await db.runAsync("DELETE FROM cache_meta");
}
