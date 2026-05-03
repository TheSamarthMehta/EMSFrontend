import { isAxiosError } from "axios";

const GENERIC = "Something went wrong. Please try again.";

const NETWORK_FALLBACK =
  "Unable to reach the server. Check your connection and try again.";

type ApiErrorBody = {
  message?: unknown;
  errors?: ReadonlyArray<{ message?: unknown; path?: unknown }>;
  issues?: ReadonlyArray<{ message?: unknown; path?: unknown }>;
};

function firstFieldMessage(data: ApiErrorBody): string | null {
  const list = data.errors ?? data.issues;
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0];
  const m = first?.message;
  return typeof m === "string" && m.trim() ? m.trim() : null;
}

/**
 * User-facing copy for failed API calls. Never surfaces Axios status-code boilerplate.
 * Prefer the backend `message` when present (already sanitized server-side).
 * For validation responses, uses the first `errors[]` / `issues[]` entry when helpful.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data && typeof data === "object") {
      const field = firstFieldMessage(data);
      if (field) return field;

      const m = data.message;
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

/** When the API returns `resendAfterSeconds` (e.g. OTP resend cooldown), expose it for UI timers. */
export function getApiErrorResendAfterSeconds(error: unknown): number | null {
  if (!isAxiosError(error)) return null;
  const raw = error.response?.data as { resendAfterSeconds?: unknown } | undefined;
  const n = raw?.resendAfterSeconds;
  if (typeof n === "number" && Number.isFinite(n)) {
    return Math.max(0, Math.ceil(n));
  }
  return null;
}

export function getApiErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const raw = error.response?.data as { errorCode?: unknown } | undefined;
  const c = raw?.errorCode;
  return typeof c === "string" && c.trim() ? c.trim() : null;
}
