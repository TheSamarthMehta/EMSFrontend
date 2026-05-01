import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getExpenses } from "@/api/expenses";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";

export function useExpenses(page = 1, limit = 20) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["expenses", page, limit],
    queryFn: () => getExpenses({ page, limit, sort: "date", order: "desc" }),
    enabled: tokenReady,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
