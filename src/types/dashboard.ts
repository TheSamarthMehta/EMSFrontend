export interface DashboardSummaryBlock {
  total: number;
  transactions?: number;
  changePercent: number;
}

export interface BiggestExpenseInsight {
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface MonthlyComparisonRow {
  label: string;
  year: number;
  month: number;
  expense: number;
  income: number;
  net: number;
}

export interface MergedDailyPoint {
  date: string;
  expense: number;
  income: number;
}

export interface DashboardRecentTransaction {
  id: string;
  type: "expense" | "income";
  title: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface DashboardResponse {
  preset: string;
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
  summary: {
    income: DashboardSummaryBlock;
    expense: DashboardSummaryBlock;
    net: { total: number; changePercent: number };
    savingsRate: number | null;
    savingsRatePrevious: number | null;
  };
  insights: {
    avgDailyExpense: number;
    periodDays: number;
    biggestExpense: BiggestExpenseInsight | null;
  };
  topExpenseCategories: Array<{ category: string; total: number; count: number }>;
  monthlyComparison: MonthlyComparisonRow[];
  timeline: {
    days: number;
    expenses: Array<{ date: string; total: number }>;
    income: Array<{ date: string; total: number }>;
    mergedDaily: MergedDailyPoint[];
  };
  recentTransactions: DashboardRecentTransaction[];
}
