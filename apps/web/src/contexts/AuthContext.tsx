import {
  type AuthUser,
  fetchAuthSession,
  getCurrentUser,
  signOut,
} from "aws-amplify/auth";
import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refreshSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      await fetchAuthSession();

      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      // Don't set error for "No current user" as this is an expected state
      if (
        err instanceof Error &&
        err.name === "AuthError" &&
        err.message.includes("No current user")
      ) {
        console.log("No authenticated user found");
      } else {
        console.error("Authentication error:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to authenticate"),
        );
      }

      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ global: true });
      setIsAuthenticated(false);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to sign out"));
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  // 認証情報の定期的な更新（1時間ごと）
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(
        () => {
          refreshSession();
        },
        55 * 60 * 1000,
      ); // 55分ごとに更新（有効期限の1時間より少し短く）

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    signOut: handleSignOut,
    refreshSession,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
