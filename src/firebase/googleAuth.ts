import {
  GoogleAuthProvider,
  type AuthError,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { AppUser } from "@/types/auth.types";

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

interface GoogleAuthErrorDetails {
  message: string;
  code?: string;
  redirectUrl?: string;
}

function toDate(value: Timestamp | undefined): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

function mapUser(user: FirebaseUser, docData: FirestoreUserDoc | null): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phone: docData?.phone ?? null,
    isPhoneVerified: docData?.isPhoneVerified ?? false,
    isProfileComplete: docData?.isProfileComplete ?? false,
    provider: "google",
    currency: docData?.currency ?? "INR",
    company: docData?.company ?? null,
    createdAt: toDate(docData?.createdAt),
    lastLogin: new Date(),
  };
}

function buildSsslipRedirectUrl(): string | null {
  const { protocol, hostname, port, pathname, search, hash } = window.location;
  const isPrivateIp =
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
  if (!isPrivateIp) {
    return null;
  }
  const sslipHost = `${hostname.replace(/\./g, "-")}.sslip.io`;
  const normalizedPort = port ? `:${port}` : "";
  return `${protocol}//${sslipHost}${normalizedPort}${pathname}${search}${hash}`;
}

function mapGoogleAuthError(error: unknown): GoogleAuthErrorDetails {
  const authError = error as Partial<AuthError>;
  switch (authError.code) {
    case "auth/popup-closed-by-user":
      return { message: "Google sign-in was cancelled.", code: authError.code };
    case "auth/cancelled-popup-request":
      return {
        message: "Previous Google sign-in attempt was cancelled.",
        code: authError.code,
      };
    case "auth/popup-blocked":
      return {
        message: "Popup was blocked. Please allow popups and try again.",
        code: authError.code,
      };
    case "auth/network-request-failed":
      return { message: "Network issue during Google sign-in. Please retry.", code: authError.code };
    case "auth/unauthorized-domain":
      {
        const redirectUrl = buildSsslipRedirectUrl();
      return {
        message:
          "This host is not authorized in Firebase Auth. Add this domain in Firebase Authentication > Settings > Authorized domains.",
        code: authError.code,
        redirectUrl: redirectUrl ?? undefined,
      };
      }
    default:
      return {
        message: error instanceof Error ? error.message : "Google sign-in failed",
        code: authError.code,
      };
  }
}

export async function signInWithGoogle(): Promise<AppUser> {
  let signedInUserUid: string | null = null;
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    signedInUserUid = firebaseUser.uid;
    const userRef = doc(db, "users", firebaseUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phone: null,
        isPhoneVerified: false,
        isProfileComplete: false,
        provider: "google",
        currency: "INR",
        company: null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      return mapUser(firebaseUser, null);
    }

    await updateDoc(userRef, { lastLogin: serverTimestamp() });
    return mapUser(firebaseUser, snapshot.data() as FirestoreUserDoc);
  } catch (error) {
    if (signedInUserUid && auth.currentUser?.uid === signedInUserUid) {
      await signOut(auth);
    }
    const mapped = mapGoogleAuthError(error);
    const enriched = new Error(mapped.message) as Error & {
      code?: string;
      redirectUrl?: string;
    };
    enriched.code = mapped.code;
    enriched.redirectUrl = mapped.redirectUrl;
    throw enriched;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign out failed";
    throw new Error(message);
  }
}
