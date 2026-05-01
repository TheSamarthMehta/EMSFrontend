const AUTH_INTENT_KEY = "ems_auth_intent";

export type AuthIntent = "signin" | "signup";

export function setAuthIntent(intent: AuthIntent): void {
  sessionStorage.setItem(AUTH_INTENT_KEY, intent);
}

export function getAuthIntent(): AuthIntent {
  const value = sessionStorage.getItem(AUTH_INTENT_KEY);
  return value === "signup" ? "signup" : "signin";
}

export function clearAuthIntent(): void {
  sessionStorage.removeItem(AUTH_INTENT_KEY);
}
