import { api } from "@/api/client";
import type { ExpenseListResponse, ExpenseRow } from "@/types/expense";

export async function getExpenses(params: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}): Promise<ExpenseListResponse> {
  const { data } = await api.get<ExpenseListResponse>("/get-expenses", {
    params: { ...params, usePaging: "1" },
  });
  return data;
}

export async function postExpense(body: {
  title: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}): Promise<{ id: string; expense: ExpenseRow }> {
  const { data } = await api.post("/add-expense", body);
  return data as { id: string; expense: ExpenseRow };
}
