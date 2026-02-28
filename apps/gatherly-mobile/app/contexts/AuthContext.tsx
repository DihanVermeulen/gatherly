import {
  createContext,
  use,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import * as SecureStore from "expo-secure-store";
import { setAccessToken, setSignOutCallback } from "../api/client";
import { authApi, type User } from "../api/auth";
import { clearCache } from "@/lib/cache";
import { initDatabase } from "@/lib/database";

type AuthContextValue = {
  session: string | null; // accessToken — used by _layout.tsx Stack.Protected guard
  user: User | null;
  isLoading: boolean;
  signIn: (accessToken: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "gatherly_access_token";
const USER_KEY = "gatherly_user";

export function useSession() {
  const value = use(AuthContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt silent token refresh on mount (relies on HttpOnly cookie)
  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await authApi.refresh();
        // Store new access token and user in SecureStore
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken);
        await SecureStore.setItemAsync(
          USER_KEY,
          JSON.stringify(response.user),
        );
        setAccessToken(response.accessToken);
        setSession(response.accessToken);
        setUser(response.user);
      } catch {
        // Refresh failed — clear any stale data and show login
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        setAccessToken(null);
        setSession(null);
        setUser(null);
      } finally {
        // Always unblock the splash screen / navigation guard
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const signIn = async (accessToken: string, newUser: User): Promise<void> => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
    setAccessToken(accessToken);
    setSession(accessToken);
    setUser(newUser);
  };

  const signOut = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Don't fail sign-out if API is unreachable
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    // Clear SQLite cache on sign-out
    try {
      const db = await initDatabase();
      await clearCache(db);
    } catch (err) {
      console.log("Failed to clear cache on sign-out:", err);
    }
    setAccessToken(null);
    setSession(null);
    setUser(null);
  };

  // Register signOut with the axios interceptor so 401s trigger logout
  useEffect(() => {
    setSignOutCallback(signOut);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
