export type AlertThreshold = 50 | 75 | 90 | 100;

export interface BudgetRow {
  _id: string;
  userId: string;
  category: string;
  year: number;
  month: number;
  limit: number;
  note: string;
  manualSpentOverride?: number | null;
  alertEnabled?: boolean;
  alertThreshold?: AlertThreshold;
  rolloverEnabled?: boolean;
  rolloverAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetSummaryCategory extends BudgetRow {
  spent: number;
  spentFromExpenses?: number;
  effectiveLimit?: number;
  remaining: number;
  utilizationPercent: number;
  status: "ok" | "warning" | "over";
}

export interface BudgetSummaryResponse {
  year: number;
  month: number;
  totals: {
    budgetedCategories: number;
    totalLimit: number;
    totalEffectiveLimit: number;
    totalSpentOnBudgetedCategories: number;
  };
  categories: BudgetSummaryCategory[];
}
