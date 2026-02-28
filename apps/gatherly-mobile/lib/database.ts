import * as SQLite from "expo-sqlite";

export type { SQLiteDatabase } from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens the gatherly SQLite database and initialises the schema.
 *
 * Uses a module-level singleton so repeated calls return the same instance.
 * WAL mode is enabled for crash resilience.
 *
 * Tables:
 * - events: Cached event blobs including embedded wishlists
 * - cache_meta: Arbitrary key/value store for cache metadata (e.g. last-fetched timestamp)
 *
 * NOTE: There is NO wishlist_items table. Wishlists are embedded inside the
 * event JSON blob (event.wishlists array) and cached as part of the `data` column.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db !== null) {
    return db;
  }

  const instance = await SQLite.openDatabaseAsync("gatherly.db");

  // Enable WAL mode for crash resilience and concurrent read performance
  await instance.execAsync("PRAGMA journal_mode = WAL;");

  await instance.execAsync(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT,
      participant_count INTEGER DEFAULT 0,
      gift_count INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );
  `);

  db = instance;
  return db;
}
