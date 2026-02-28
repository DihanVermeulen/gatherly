import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNetworkStatus } from "./useNetworkStatus";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

/**
 * Hook for monitoring sync queue status.
 *
 * Derives sync status from:
 * - Network connectivity (useNetworkStatus via @react-native-community/netinfo)
 * - Active mutations (useIsMutating)
 * - Failed mutations in cache
 *
 * Returns:
 * - status: Current sync state (synced | syncing | offline | error)
 * - mutatingCount: Number of active mutations
 * - isOnline: Network connectivity status
 * - lastError: Most recent mutation error message
 * - retryFailedMutations: Function to retry failed mutations
 */
export function useSyncStatus() {
  const queryClient = useQueryClient();
  const mutatingCount = useIsMutating();

  // Track online/offline status via NetInfo (works on iOS, Android, and web)
  const isConnected = useNetworkStatus();
  // Treat null (initializing) and true (connected) as online; only false = offline
  const isOnline = isConnected !== false;

  // Check for failed mutations
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasFailedMutations, setHasFailedMutations] = useState(false);

  useEffect(() => {
    const cache = queryClient.getMutationCache();
    const mutations = cache.getAll();

    const failed = mutations.filter(
      (m) => m.state.status === "error" && m.state.isPaused === false,
    );

    setHasFailedMutations(failed.length > 0);

    if (failed.length > 0) {
      const latestError = failed[failed.length - 1];
      setLastError(
        latestError.state.error instanceof Error
          ? latestError.state.error.message
          : "Mutation failed",
      );
    } else {
      setLastError(null);
    }
  }, [queryClient, mutatingCount]);

  // Derive status
  let status: SyncStatus;
  if (hasFailedMutations) {
    status = "error";
  } else if (!isOnline) {
    status = "offline";
  } else if (mutatingCount > 0) {
    status = "syncing";
  } else {
    status = "synced";
  }

  // Retry failed mutations
  const retryFailedMutations = async () => {
    setHasFailedMutations(false);
    setLastError(null);
    await queryClient.resumePausedMutations();
  };

  return {
    status,
    mutatingCount,
    isOnline,
    lastError,
    retryFailedMutations,
  };
}
