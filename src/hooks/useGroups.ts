import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getGroups } from "@/api/groups";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

export function useGroups(filters?: {
  q?: string;
  status?: "all" | "active" | "inactive" | "archived";
  sortBy?: "recent" | "spent" | "members" | "name";
  limit?: number;
  cursor?: string | null;
}) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["groups", filters],
    queryFn: async () => {
      return getGroups(filters);
    },
    enabled: tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
