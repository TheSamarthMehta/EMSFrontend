import axios, { type AxiosError, type InternalAxiosRequestConfig, isAxiosError } from "axios";
import { auth } from "@/firebase/config";
import { useAuthStore } from "@/store/authStore";

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  const fallback = `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
  const isDev = import.meta.env.DEV;
  if (!configured) {
    return fallback;
  }

  try {
    const parsed = new URL(configured);
    const isLocalLikeConfigured =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname);
    if (isDev && isLocalLikeConfigured) {
      parsed.hostname = window.location.hostname;
      return parsed.toString().replace(/\/$/, "");
    }
    return configured;
  } catch {
    return configured;
  }
}

const baseURL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

/** No auth interceptor — used for refresh bootstrap only */
export const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
let refreshBlockedUntil = 0;

/**
 * Single-flight refresh used by the axios interceptor and `useSession` so we never
 * stampede `/auth/refresh-token` (which used to 429 under Strict Mode + 401 retries).
 */
export async function tryRefreshAccessToken(): Promise<string | null> {
  if (auth.currentUser) {
    return null;
  }

  if (Date.now() < refreshBlockedUntil) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ accessToken: string }>("/auth/refresh-token")
      .then((res) => {
        const next = res.data.accessToken;
        useAuthStore.getState().setAccessToken(next);
        refreshBlockedUntil = 0;
        return next;
      })
      .catch((err: unknown) => {
        useAuthStore.getState().setAccessToken(null);
        const status = isAxiosError(err) ? err.response?.status : undefined;
        const backoffMs = status === 429 ? 60_000 : 30_000;
        refreshBlockedUntil = Date.now() + backoffMs;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = String(original?.url || "");

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/register") &&
      !url.includes("/auth/refresh-token") &&
      !auth.currentUser
    ) {
      original._retry = true;
      const token = await tryRefreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }

    if (import.meta.env.DEV && isAxiosError(error)) {
      console.error("[API client] Developer details", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        responseData: error.response?.data,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);
