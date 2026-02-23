import { createContext, use, useState, type PropsWithChildren } from 'react';

type AuthContextValue = {
  session: string | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const [isLoading] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        signIn: (token) => setSession(token),
        signOut: () => setSession(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
