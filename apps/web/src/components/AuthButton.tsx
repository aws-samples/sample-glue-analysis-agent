import { signInWithRedirect, signOut } from "aws-amplify/auth";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export const AuthButton = () => {
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

  const handleSignOut = async () => {
    try {
      // ログアウト処理
      await signOut({ global: true });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isLoading || isSigningIn) {
    return (
      <button
        className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-400 rounded-md"
        disabled
      >
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
        読み込み中...
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        onClick={handleSignOut}
        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        ログアウト
      </button>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
      ログイン
    </button>
  );
};
