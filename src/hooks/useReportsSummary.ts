import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getReportsSummary } from "@/api/reports";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

export function useReportsSummary(
  filters: {
    type: string;
    from?: string;
    to?: string;
    category?: string;
    q?: string;
  },
  options?: { enabled?: boolean }
) {
  const tokenReady = useBackendQueryEnabled();
  const hasRange = Boolean(filters.from && filters.to);
  return useQuery({
    queryKey: ["reports-summary", filters],
    queryFn: () => getReportsSummary(filters),
    enabled: tokenReady && hasRange && (options?.enabled ?? true),
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
