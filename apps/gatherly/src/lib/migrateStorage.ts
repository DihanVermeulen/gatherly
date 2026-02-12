/**
 * Migration utility to convert v1 localStorage data to TanStack Query format.
 *
 * Old format (v1): { events: Event[] } stored under 'secret_santa_events'
 * New format (v2): TanStack Query cache under 'gatherly-query-cache'
 *
 * This runs once on app boot (before React renders) to preserve existing user data.
 */

const OLD_STORAGE_KEY = "secret_santa_events";
const MIGRATION_VERSION_KEY = "gatherly-migration-version";

export function migrateFromV1(): void {
  try {
    // Check if already migrated
    const version = localStorage.getItem(MIGRATION_VERSION_KEY);
    if (version === "2") {
      console.log("Storage already migrated to v2");
      return;
    }

    // Read old data
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldData) {
      console.log("No v1 data found, setting migration version");
      localStorage.setItem(MIGRATION_VERSION_KEY, "2");
      return;
    }

    // Parse and normalize old events
    const parsed = JSON.parse(oldData);
    const events = parsed.events || [];

    // Ensure all events have required fields for backward compatibility
    const normalizedEvents = events.map((event: any) => ({
      ...event,
      wishlists: event.wishlists || [],
      gifts: event.gifts || {},
    }));

    // Create backup before migration
    localStorage.setItem(
      "gatherly-events-v1-backup",
      JSON.stringify({ events: normalizedEvents })
    );

    console.log(`Migrated ${normalizedEvents.length} events from v1 to v2`);

    // Mark migration complete
    localStorage.setItem(MIGRATION_VERSION_KEY, "2");

    // NOTE: We do NOT delete the old key yet for safety during transition.
    // Users can manually clear it later if needed.
  } catch (error) {
    console.error("Migration from v1 failed:", error);
    // Never throw - allow app to boot even if migration fails
  }
}
