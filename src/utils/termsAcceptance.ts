export const TERMS_ACCEPTANCE_SESSION_KEY = "ems_terms_acceptance_session_v1";
export const TERMS_ACCEPTANCE_EVENT_KEY = "ems_terms_acceptance_event_v1";

export function hasAcceptedTerms(): boolean {
  try {
    return window.sessionStorage.getItem(TERMS_ACCEPTANCE_SESSION_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function setTermsAcceptedInCurrentTab(): void {
  try {
    window.sessionStorage.setItem(TERMS_ACCEPTANCE_SESSION_KEY, "accepted");
  } catch {
    // no-op when storage is unavailable
  }
}

export function markTermsAccepted(): void {
  try {
    // Session-scoped acceptance: cleared when browser session ends.
    setTermsAcceptedInCurrentTab();
    // Broadcast acceptance to other open tabs (e.g., signup tab listening for terms completion).
    window.localStorage.setItem(TERMS_ACCEPTANCE_EVENT_KEY, String(Date.now()));
  } catch {
    // no-op when storage is unavailable
  }
}
