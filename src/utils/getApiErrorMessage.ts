import { isAxiosError } from "axios";

const GENERIC = "Something went wrong. Please try again.";

const NETWORK_FALLBACK =
  "Unable to reach the server. Check your connection and try again.";

/**
 * User-facing copy for failed API calls. Never surfaces Axios status-code boilerplate.
 * Prefer the backend `message` when present (already sanitized server-side).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string" && m.trim()) return m.trim();
    }

    if (error.response == null) {
      return NETWORK_FALLBACK;
    }

    if (error.response.status >= 500) {
      return GENERIC;
    }

    return fallback;
  }

  if (error instanceof Error) {
    const m = error.message.trim();
    if (m.startsWith("Request failed with status code")) {
      return fallback;
    }
    if (m) return m;
  }

  return fallback;
}
