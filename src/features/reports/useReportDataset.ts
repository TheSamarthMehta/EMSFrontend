import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getExpenses } from "@/api/expenses";
import { getIncomes } from "@/api/incomes";
import { useBackendQueryEnabled } from "@/hooks/useBackendQueryEnabled";
import type { ExpenseRow } from "@/types/expense";
import {
  expenseRowToTransaction,
  fetchAllPaged,
  incomeRowToTransaction,
  type ReportTransaction,
} from "@/features/reports/reportUtils";

export function useReportDataset(from: string, to: string) {
  const tokenReady = useBackendQueryEnabled();
  return useQuery({
    queryKey: ["report-dataset", from, to],
    queryFn: async (): Promise<ReportTransaction[]> => {
      const params = { from, to, sort: "date" as const, order: "asc" as const };
      const [expRows, incRows] = await Promise.all([
        fetchAllPaged((page) => getExpenses({ ...params, page, limit: 100 })),
        fetchAllPaged((page) => getIncomes({ ...params, page, limit: 100 })),
      ]);
      const tx: ReportTransaction[] = [
        ...(expRows as ExpenseRow[]).map(expenseRowToTransaction),
        ...(incRows as ExpenseRow[]).map(incomeRowToTransaction),
      ];
      tx.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      return tx;
    },
    enabled: tokenReady && Boolean(from && to),
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
