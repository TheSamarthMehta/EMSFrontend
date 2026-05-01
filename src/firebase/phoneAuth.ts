import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  signInWithPhoneNumber,
  type AuthError,
  type ConfirmationResult,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

declare global {
  interface Window {
    grecaptcha?: {
      reset: (widgetId?: number) => void;
    };
    __emsRecaptchaVerifier?: RecaptchaVerifier;
    __emsRecaptchaContainerId?: string;
  }
}

async function resetRecaptcha(recaptchaVerifier: RecaptchaVerifier): Promise<void> {
  try {
    const widgetId = await recaptchaVerifier.render();
    window.grecaptcha?.reset(widgetId);
  } catch {
    // ignore reset failures
  }
}

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (
    window.__emsRecaptchaVerifier &&
    window.__emsRecaptchaContainerId === containerId
  ) {
    return window.__emsRecaptchaVerifier;
  }

  if (window.__emsRecaptchaVerifier) {
    try {
      window.__emsRecaptchaVerifier.clear();
    } catch {
      // ignore cleanup errors
    }
  }

  auth.useDeviceLanguage();
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {},
  });
  void verifier.render();
  window.__emsRecaptchaVerifier = verifier;
  window.__emsRecaptchaContainerId = containerId;
  return verifier;
}

export async function sendOTP(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  } catch (error) {
    const authError = error as Partial<AuthError>;
    let message = error instanceof Error ? error.message : "Unable to send OTP";
    if (authError.code === "auth/operation-not-allowed") {
      message =
        "Phone sign-in is disabled in Firebase. Enable Phone provider in Firebase Authentication > Sign-in method.";
    } else if (authError.code === "auth/invalid-phone-number") {
      message = "Invalid phone number format. Use country code, e.g. +919638057135.";
    } else if (authError.code === "auth/captcha-check-failed") {
      message = "reCAPTCHA verification failed. Please refresh and try again.";
    }
    await resetRecaptcha(recaptchaVerifier);
    throw new Error(message);
  }
}

export async function verifyOTP(
  confirmationResult: ConfirmationResult,
  otp: string,
  uid: string,
  phone: string
): Promise<void> {
  try {
    const activeUser = auth.currentUser;
    if (activeUser) {
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
      await linkWithCredential(activeUser, credential);
    } else {
      await confirmationResult.confirm(otp);
    }
    await setDoc(
      doc(db, "users", uid),
      {
        phone,
        isPhoneVerified: true,
        isProfileComplete: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    const authError = error as Partial<AuthError>;
    let message = error instanceof Error ? error.message : "OTP verification failed";
    if (authError.code === "auth/invalid-verification-code") {
      message = "Invalid OTP code. Please re-check and try again.";
    } else if (authError.code === "auth/code-expired") {
      message = "OTP expired. Please resend and try again.";
    }
    throw new Error(message);
  }
}
