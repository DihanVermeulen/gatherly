import {
  createContext,
  use,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { ActivityIndicator, View } from "react-native";
import { initDatabase } from "@/lib/database";
import type { SQLiteDatabase } from "@/lib/database";

type DatabaseContextValue = SQLiteDatabase | null;

const DatabaseContext = createContext<DatabaseContextValue>(null);

/**
 * Initialises the SQLite database on mount and provides the db instance to
 * all descendant components via context.
 *
 * Blocks rendering of children until the database is ready, so downstream
 * consumers can safely call useDatabase() without null-checking.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    let cancelled = false;

    initDatabase()
      .then((instance) => {
        if (!cancelled) {
          setDb(instance);
        }
      })
      .catch((error) => {
        // In development, surface the error so it's easy to diagnose
        console.error("[DatabaseProvider] Failed to initialise database:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (db === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <DatabaseContext value={db}>
      {children}
    </DatabaseContext>
  );
}

/**
 * Returns the initialised SQLiteDatabase instance.
 *
 * Must be called inside a DatabaseProvider. Throws if the database is not
 * ready — this should never happen because DatabaseProvider blocks rendering
 * until the DB is initialised.
 */
export function useDatabase(): SQLiteDatabase {
  const db = use(DatabaseContext);
  if (db === null) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return db;
}
