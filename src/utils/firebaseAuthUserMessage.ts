/**
 * Short, user-facing copy for common Firebase Auth errors (no error codes in UI).
 */
export function firebaseAuthUserMessage(err: unknown, fallback: string): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in window is already open.";
    case "auth/network-request-failed":
      return "A network issue interrupted sign-in. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists for this email with a different sign-in method.";
    default:
      return fallback;
  }
}
