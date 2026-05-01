import { OAuthProvider, signInWithPopup, type User as FirebaseUser } from "firebase/auth";
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

function toDate(value: Timestamp | undefined): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

function fallbackName(user: FirebaseUser): string | null {
  if (user.displayName) {
    return user.displayName;
  }
  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix || null;
}

function mapUser(user: FirebaseUser, docData: FirestoreUserDoc | null): AppUser {
  const resolvedDisplayName = fallbackName(user);
  return {
    uid: user.uid,
    email: user.email,
    displayName: resolvedDisplayName,
    photoURL: user.photoURL,
    phone: docData?.phone ?? null,
    isPhoneVerified: docData?.isPhoneVerified ?? false,
    isProfileComplete: docData?.isProfileComplete ?? false,
    provider: "apple",
    currency: docData?.currency ?? "INR",
    company: docData?.company ?? null,
    createdAt: toDate(docData?.createdAt),
    lastLogin: new Date(),
  };
}

export async function signInWithApple(): Promise<AppUser> {
  try {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");

    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const resolvedDisplayName = fallbackName(firebaseUser);
    const userRef = doc(db, "users", firebaseUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: resolvedDisplayName,
        photoURL: firebaseUser.photoURL,
        phone: null,
        isPhoneVerified: false,
        isProfileComplete: false,
        provider: "apple",
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
    const message = error instanceof Error ? error.message : "Apple sign-in failed";
    throw new Error(message);
  }
}
