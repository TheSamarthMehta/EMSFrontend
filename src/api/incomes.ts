import { api } from "@/api/client";
import type { ExpenseListResponse } from "@/types/expense";

export async function getIncomes(params: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  from?: string;
  to?: string;
  category?: string;
  q?: string;
}): Promise<ExpenseListResponse> {
  const { data } = await api.get<ExpenseListResponse>("/get-incomes", {
    params: { ...params, usePaging: "1" },
  });
  return data;
}
