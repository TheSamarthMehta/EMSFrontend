import { useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const { user, loading, error, signInWithApple, signOut, clearError } = useAuthContext();
  const isAuthenticated = Boolean(user);
  return {
    user,
    loading,
    error,
    isAuthenticated,
    signInWithApple,
    signOut,
    clearError,
  };
}
