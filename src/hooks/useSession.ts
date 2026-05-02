import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/api/auth";
import { tryRefreshAccessToken } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

export function useSession(enabled = true) {
  const shouldRun = Boolean(enabled);

  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      let nextToken = useAuthStore.getState().accessToken;
      if (!nextToken) {
        nextToken = await tryRefreshAccessToken();
        if (!nextToken) {
          throw new Error("SESSION_UNAVAILABLE");
        }
      }
      return getMe();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: shouldRun,
  });
}
