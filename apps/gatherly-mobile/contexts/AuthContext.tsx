import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi, User } from "../api/auth";
import { setAccessToken } from "../api/client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithMagicLink: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-refresh interval (14 minutes - 1 minute before expiry)
  const AUTO_REFRESH_INTERVAL = 14 * 60 * 1000;

  // Restore session from HttpOnly cookie on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await authApi.refresh();
        setAccessToken(response.accessToken);
        setUser(response.user);
      } catch (error) {
        console.log("No valid session to restore");
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Auto-refresh access token before expiry
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await authApi.refresh();
        setAccessToken(response.accessToken);
        setUser(response.user);
        console.log("Access token refreshed automatically");
      } catch (error) {
        console.error("Auto-refresh failed:", error);
        setUser(null);
        setAccessToken(null);
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const response = await authApi.register(email, password, name);
      setAccessToken(response.accessToken);
      setUser(response.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const loginWithMagicLink = useCallback(async (token: string) => {
    const response = await authApi.redeemMagicLink(token);
    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, loginWithMagicLink }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext };
