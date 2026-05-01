import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getFriends, getIncomingRequests } from "@/api/friends";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

const retryNo401 = (failureCount: number, error: unknown): boolean => {
  if (isAxiosError(error) && error.response?.status === 401) return false;
  return failureCount < 1;
};

export function useFriends() {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const { friends } = await getFriends();
      return friends;
    },
    enabled: tokenReady,
    retry: retryNo401,
  });
}

export function useIncomingRequests() {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["friend-requests-incoming"],
    queryFn: async () => {
      const { incoming } = await getIncomingRequests();
      return incoming;
    },
    enabled: tokenReady,
    retry: retryNo401,
  });
}
