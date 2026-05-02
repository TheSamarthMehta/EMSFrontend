import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getIdToken,
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { postLogout } from "@/api/auth";
import { signInWithApple as firebaseSignInWithApple } from "@/firebase/appleAuth";
import { auth, db } from "@/firebase/config";
import { postFirebaseSession } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { AppUser } from "@/types/auth.types";
import {
  clearEmailOtpState,
  isEmailOtpVerifiedFor,
  markEmailOtpPending,
  markEmailOtpVerified,
} from "@/utils/emailGate";
import { firebaseAuthUserMessage } from "@/utils/firebaseAuthUserMessage";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

interface FirestoreUserDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phone: string | null;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  provider: "google" | "apple" | "email";
  currency: string;
  company: string | null;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toDate(value: Timestamp | undefined): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

function toAppUser(firebaseUser: FirebaseUser, data: FirestoreUserDoc | null): AppUser {
  const provider = data?.provider ?? detectProvider(firebaseUser);
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: data?.displayName ?? firebaseUser.displayName,
    photoURL: data?.photoURL ?? firebaseUser.photoURL,
    phone: data?.phone ?? null,
    isPhoneVerified: data?.isPhoneVerified ?? false,
    isProfileComplete: data?.isProfileComplete ?? true,
    provider,
    currency: data?.currency ?? "INR",
    company: data?.company ?? null,
    createdAt: toDate(data?.createdAt),
    lastLogin: toDate(data?.lastLogin),
  };
}

function detectProvider(firebaseUser: FirebaseUser): "google" | "apple" | "email" {
  const providerIds = firebaseUser.providerData.map((item) => item.providerId);
  if (providerIds.includes("google.com")) return "google";
  if (providerIds.includes("apple.com")) return "apple";
  return "email";
}

/** OAuth users must never be routed through backend email OTP; trust Firebase providerData over Firestore. */
function firebaseHasOAuthProvider(firebaseUser: FirebaseUser): boolean {
  return firebaseUser.providerData.some(
    (p) => p.providerId === "google.com" || p.providerId === "apple.com"
  );
}

function firebaseHasPasswordProvider(firebaseUser: FirebaseUser): boolean {
  return firebaseUser.providerData.some((p) => p.providerId === "password");
}

/** When the tab stays hidden this long, end the server session (refresh cookie). Skips email verification so users can resume the next day. */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const pathnameRef = useRef<string>(location.pathname);
  const isMountedRef = useRef<boolean>(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const clearError = useCallback(() => setError(null), []);
  const clearServerSessionState = useCallback(async (): Promise<void> => {
    try {
      await postLogout();
    } catch {
      // Ignore — still clear client state.
    }
    setAccessToken(null);
    queryClient.removeQueries({ queryKey: ["session"] });
    clearEmailOtpState();
  }, [queryClient, setAccessToken]);

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
        try {
          await signOut(auth);
        } catch {
          // Ignore
        }
        navigate("/login", { replace: true });
      })();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [navigate, queryClient, setAccessToken]);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMountedRef.current) {
        setLoading(true);
      }
      try {
        if (!firebaseUser) {
          if (isMountedRef.current) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const snapshot = await getDoc(userRef);
        if (!snapshot.exists()) {
          const provider = detectProvider(firebaseUser);
          await setDoc(
            userRef,
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              phone: null,
              isPhoneVerified: true,
              isProfileComplete: true,
              provider,
              currency: "INR",
              company: null,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            },
            { merge: true }
          );
        }
        const latestSnapshot = await getDoc(userRef);
        const appUser = toAppUser(
          firebaseUser,
          latestSnapshot.exists() ? (latestSnapshot.data() as FirestoreUserDoc) : null
        );
        if (!isMountedRef.current) {
          return;
        }
        setUser(appUser);

        const path = pathnameRef.current;
        const isAuthRoute =
          path === "/auth" || path === "/login" || path === "/register";
        const email = appUser.email ?? "";
        const hasOAuth = firebaseHasOAuthProvider(firebaseUser);
        if (hasOAuth && email) {
          markEmailOtpVerified(email);
        }
        const needsEmailOtpForEmailProvider =
          !hasOAuth &&
          firebaseHasPasswordProvider(firebaseUser) &&
          Boolean(email) &&
          !isEmailOtpVerifiedFor(email);

        if (needsEmailOtpForEmailProvider && path !== "/verify-email-code") {
          markEmailOtpPending(email);
          navigate("/verify-email-code", { replace: true });
        } else if (!needsEmailOtpForEmailProvider && isAuthRoute) {
          // Do not navigate away from /verify-email-code here — that route handles OTP and
          // OAuth edge cases; a stale Firebase OAuth session would otherwise skip email OTP.
          navigate("/dashboard", { replace: true });
        }
      } catch (authError: unknown) {
        const message = getApiErrorMessage(authError, "Unable to load user");
        if (isMountedRef.current) {
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleAppleSignIn = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const appUser = await firebaseSignInWithApple();
      if (!isMountedRef.current) {
        return;
      }
      setUser(appUser);
      try {
        const idToken = await getIdToken(auth.currentUser!, true);
        const session = await postFirebaseSession({
          idToken,
          email: appUser.email ?? undefined,
        });
        setAccessToken(session.accessToken);
        if (appUser.email) {
          markEmailOtpVerified(appUser.email);
        }
        navigate(session.user.isProfileComplete ? "/dashboard" : "/complete-profile", {
          replace: true,
        });
      } catch (backendError) {
        const apiError = backendError as {
          response?: { status?: number; data?: { errorCode?: string; message?: string } };
        };
        const status = apiError.response?.status;
        const errorCode = apiError.response?.data?.errorCode;
        if (status === 404 || errorCode === "ACCOUNT_NOT_FOUND") {
          await clearServerSessionState();
          if (isMountedRef.current) {
            setError("Account not found for this Apple ID. Please sign up first.");
          }
          await signOut(auth);
          setUser(null);
          return;
        }
        const message = getApiErrorMessage(backendError, "Apple sign-in failed");
        if (isMountedRef.current) {
          setError(message);
        }
      }
    } catch (authError: unknown) {
      const message = firebaseAuthUserMessage(authError, "Apple sign-in failed");
      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [clearServerSessionState, navigate, setAccessToken]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
      clearEmailOtpState();
      setUser(null);
      navigate("/auth", { replace: true });
    } catch (authError: unknown) {
      setError(firebaseAuthUserMessage(authError, "Could not sign out. Please try again."));
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,
      signInWithApple: handleAppleSignIn,
      signOut: handleSignOut,
      clearError,
    }),
    [clearError, error, handleAppleSignIn, handleSignOut, loading, user]
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
