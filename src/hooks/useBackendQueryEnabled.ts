import { useAuthStore } from "@/store/authStore";

/** Protected API routes require a Mongo-backed JWT in the client store. */
export function useBackendQueryEnabled(): boolean {
  return useAuthStore((s) => Boolean(s.accessToken));
}
