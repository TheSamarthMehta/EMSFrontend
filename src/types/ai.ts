/** Category id is one of `EXPENSE_CATEGORIES[i].id`. Kept as string for compat. */
export type AiCategoryId = string;

export type AiInsightTone = "positive" | "neutral" | "warning" | "tip";

export interface AiInsightItem {
  title: string;
  detail: string;
  tone: AiInsightTone;
}

export interface AiFinancialSnapshot {
  lookbackDays: number;
  period: { from: string; to: string };
  totals: {
    expenseLookback: number;
    incomeLookback: number;
    expenseThisMonth: number;
    incomeThisMonth: number;
    transactionCount: number;
    avgDailySpend: number;
    savingsRatePercent: number | null;
  };
  topCategories: Array<{ category: string; total: number; count: number }>;
  budgets: Array<{ category: string; limit: number; spent: number; percentUsed: number }>;
}

export interface AiInsightsResponse {
  enabled: boolean;
  message?: string;
  summary?: string;
  insights?: AiInsightItem[];
  snapshot: AiFinancialSnapshot;
}

export interface AiStatusResponse {
  enabled: boolean;
}

export type AiChatRole = "user" | "model";

export interface AiChatTurn {
  role: AiChatRole;
  text: string;
}

export interface AiChatRequest {
  message: string;
  history?: AiChatTurn[];
}

export interface AiChatResponse {
  enabled: boolean;
  reply: string;
}

export interface AiCategorizeRequest {
  title: string;
  description?: string;
  amount?: number;
}

export interface AiCategorizeResponse {
  enabled: boolean;
  category: AiCategoryId;
  confidence: number;
  reason?: string;
}

export interface AiParseExpenseRequest {
  text: string;
}

export interface AiExpenseDraft {
  title: string;
  amount: number;
  category: AiCategoryId;
  date: string;
  description: string;
  confidence: number;
}

export interface AiParseExpenseResponse {
  enabled: boolean;
  draft: AiExpenseDraft | null;
  parseError?: string;
}
