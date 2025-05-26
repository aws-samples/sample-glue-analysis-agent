import { signInWithRedirect, signOut } from "aws-amplify/auth";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (isSigningIn) return; // Prevent multiple clicks

    try {
      setIsSigningIn(true);

      // Force sign out first to clear any existing sessions
      try {
        await signOut({ global: true });
        console.log("Cleared any existing sessions before sign in");
      } catch (e) {
        console.log("No active session to clear or error clearing session:", e);
      }

      // Now proceed with sign in
      await signInWithRedirect();
    } catch (error) {
      console.error("Error signing in:", error);
      setIsSigningIn(false); // Reset state on error
    }
  };

  if (isLoading || isSigningIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">認証情報を確認中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            ログインが必要です
          </h2>
          <p className="text-gray-600 mb-6">
            このアプリケーションを使用するにはログインが必要です
          </p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={`w-full ${
              isSigningIn ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            } text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center`}
          >
            {isSigningIn ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                ログイン中...
              </>
            ) : (
              "ログイン"
            )}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
