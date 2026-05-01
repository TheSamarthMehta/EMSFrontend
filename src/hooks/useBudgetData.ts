import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getBudgets, getBudgetSummary } from "@/api/budget";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

export function useBudgets(year: number, month: number) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["budgets", year, month],
    queryFn: async () => {
      const { budgets } = await getBudgets(year, month);
      return budgets;
    },
    enabled: tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}

export function useBudgetSummary(year: number, month: number) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["budget-summary", year, month],
    queryFn: () => getBudgetSummary(year, month),
    enabled: tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
