import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * TanStack Query persister using localStorage.
 *
 * Stores the entire query cache under 'gatherly-query-cache' key.
 * This enables offline-first operation - mutations and queries persist
 * across page reloads and can sync when the connection is restored.
 */
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "gatherly-query-cache",
});
