import { api } from "@/api/client";
import type { BudgetRow, BudgetSummaryResponse } from "@/types/budget";

export async function getBudgets(year: number, month: number): Promise<{
  year: number;
  month: number;
  budgets: BudgetRow[];
}> {
  const { data } = await api.get("/budgets", { params: { year, month } });
  return data;
}

export async function getBudgetSummary(year: number, month: number): Promise<BudgetSummaryResponse> {
  const { data } = await api.get<BudgetSummaryResponse>("/budgets/summary", { params: { year, month } });
  return data;
}

export async function postBudget(body: {
  category: string;
  year: number;
  month: number;
  limit: number;
  note?: string;
  manualSpentOverride?: number | null;
  alertEnabled?: boolean;
  alertThreshold?: number;
  rolloverEnabled?: boolean;
  rolloverAmount?: number;
}): Promise<BudgetRow> {
  const { data } = await api.post<BudgetRow>("/budgets", body);
  return data;
}

export async function patchBudget(
  id: string,
  body: {
    limit?: number;
    note?: string;
    category?: string;
    manualSpentOverride?: number | null;
    alertEnabled?: boolean;
    alertThreshold?: number;
    rolloverEnabled?: boolean;
    rolloverAmount?: number;
  }
): Promise<BudgetRow> {
  const { data } = await api.patch<BudgetRow>(`/budgets/${id}`, body);
  return data;
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(`/budgets/${id}`);
}
