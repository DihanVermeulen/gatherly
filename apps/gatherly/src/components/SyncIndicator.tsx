import { useState, useEffect } from "react";
import { CloudOff, Loader2, AlertTriangle, Check } from "lucide-react";
import { useSyncStatus } from "../hooks/useSyncStatus";

/**
 * SyncIndicator renders a floating pill badge at the bottom of the screen
 * showing the current sync state: synced, syncing, offline, or error.
 *
 * States:
 * - synced:  Brief green confirmation, auto-hides after 3 seconds
 * - syncing: Blue spinner with count of active mutations
 * - offline: Amber badge indicating local-only mode
 * - error:   Red badge with retry button
 */
export function SyncIndicator() {
  const { status, mutatingCount, retryFailedMutations } = useSyncStatus();
  const [visible, setVisible] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);

  useEffect(() => {
    // When transitioning to "synced" from another state, show briefly then hide
    if (prevStatus !== "synced" && status === "synced") {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }

    // For all non-synced states, keep visible
    if (status !== "synced") {
      setVisible(true);
    }

    setPrevStatus(status);
  }, [status, prevStatus]);

  // Render nothing when synced and not in brief show window
  if (status === "synced" && !visible) {
    return null;
  }

  const baseClasses =
    "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg transition-all duration-300 text-sm font-medium";

  if (status === "synced") {
    return (
      <div
        className={`${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300`}
      >
        <Check size={14} />
        <span>All synced</span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div
        className={`${baseClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300`}
      >
        <Loader2 size={14} className="animate-spin" />
        <span>
          Syncing {mutatingCount} change{mutatingCount !== 1 ? "s" : ""}...
        </span>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div
        className={`${baseClasses} bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300`}
      >
        <CloudOff size={14} />
        <span>Offline - changes saved locally</span>
      </div>
    );
  }

  // error state
  return (
    <div
      className={`${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300`}
    >
      <AlertTriangle size={14} />
      <span>Sync failed</span>
      <button
        onClick={() => void retryFailedMutations()}
        className="ml-1 underline hover:no-underline font-semibold"
      >
        Retry
      </button>
    </div>
  );
}
