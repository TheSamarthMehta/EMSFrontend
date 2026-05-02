import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { postLogout } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { clearEmailOtpState } from "@/utils/emailGate";

/** When the tab stays hidden this long, end the server session (refresh cookie). */
const LONG_BACKGROUND_LOGOUT_MS = 24 * 60 * 60 * 1000;

function isLongBackgroundLogoutExemptPath(path: string): boolean {
  return (
    path === "/verify-email-code" ||
    path === "/auth" ||
    path === "/login" ||
    path === "/register" ||
    path === "/terms" ||
    path.startsWith("/auth/")
  );
}

interface AuthContextType {
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const pathnameRef = useRef<string>(location.pathname);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const clearError = useCallback(() => {
    /* no-op — reserved for future client-side auth messages */
  }, []);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = (): void => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt == null) {
        return;
      }
      const hiddenMs = Date.now() - hiddenAt;
      hiddenAt = null;
      if (isLongBackgroundLogoutExemptPath(pathnameRef.current) || hiddenMs < LONG_BACKGROUND_LOGOUT_MS) {
        return;
      }
      void (async () => {
        try {
          await postLogout();
        } catch {
          // Ignore — still clear client state.
        }
        setAccessToken(null);
        queryClient.removeQueries({ queryKey: ["session"] });
        clearEmailOtpState();
        navigate("/login", { replace: true });
      })();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [navigate, queryClient, setAccessToken]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await postLogout();
    } catch {
      // Ignore — still clear client state.
    }
    setAccessToken(null);
    queryClient.removeQueries({ queryKey: ["session"] });
    clearEmailOtpState();
    navigate("/login", { replace: true });
  }, [navigate, queryClient, setAccessToken]);

  const value = useMemo<AuthContextType>(
    () => ({
      loading: false,
      error: null,
      signOut: handleSignOut,
      clearError,
    }),
    [clearError, handleSignOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
