import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getDashboard } from "@/api/dashboard";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

export function useDashboard(options?: {
  preset?: string;
  timelineDays?: number;
  chartFrom?: string;
  chartTo?: string;
}) {
  const preset = options?.preset ?? "month";
  const timelineDays = options?.timelineDays ?? 30;
  const chartFrom = options?.chartFrom;
  const chartTo = options?.chartTo;
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["dashboard", preset, timelineDays, chartFrom ?? "", chartTo ?? ""],
    queryFn: () => getDashboard({ preset, timelineDays, chartFrom, chartTo }),
    enabled: tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
