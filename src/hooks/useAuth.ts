import { useAuthContext } from "@/context/AuthContext";

/** Client auth is JWT-only; `user` is always null here — use `useSession` for the signed-in profile. */
export function useAuth() {
  const { loading, error, signOut, clearError } = useAuthContext();
  return {
    user: null,
    loading,
    error,
    isAuthenticated: false,
    signOut,
    clearError,
  };
}
