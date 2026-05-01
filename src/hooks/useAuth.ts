import { useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const { user, loading, error, signInWithGoogle, signInWithApple, signOut, clearError } =
    useAuthContext();
  const isAuthenticated = Boolean(user);
  return {
    user,
    loading,
    error,
    isAuthenticated,
    signInWithGoogle,
    signInWithApple,
    signOut,
    clearError,
  };
}
