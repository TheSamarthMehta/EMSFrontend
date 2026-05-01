import type { AlertThreshold } from "@/types/budget";

/** Budget page categories: ids match expense `category` where applicable; `savings` is budget-only until expenses use it. */
export const BUDGET_CATEGORY_ORDER = [
  "food_dining",
  "transportation",
  "shopping",
  "entertainment",
  "health",
  "utilities",
  "housing",
  "education",
  "travel",
  "savings",
  "other",
] as const;

export type BudgetCategoryId = (typeof BUDGET_CATEGORY_ORDER)[number];

export type BudgetCategoryConfig = {
  id: BudgetCategoryId;
  label: string;
  emoji: string;
  colorClass: string;
  defaultLimitInr: number;
};

export const BUDGET_CATEGORY_CONFIG: ReadonlyArray<BudgetCategoryConfig> = [
  { id: "food_dining", label: "Food & Dining", emoji: "", colorClass: "bg-orange-500", defaultLimitInr: 8000 },
  { id: "transportation", label: "Transport", emoji: "", colorClass: "bg-blue-500", defaultLimitInr: 3000 },
  { id: "shopping", label: "Shopping", emoji: "", colorClass: "bg-pink-500", defaultLimitInr: 5000 },
  { id: "entertainment", label: "Entertainment", emoji: "", colorClass: "bg-purple-500", defaultLimitInr: 2000 },
  { id: "health", label: "Health", emoji: "", colorClass: "bg-green-500", defaultLimitInr: 2500 },
  { id: "utilities", label: "Utilities", emoji: "", colorClass: "bg-yellow-500", defaultLimitInr: 3000 },
  { id: "housing", label: "Rent", emoji: "", colorClass: "bg-slate-500", defaultLimitInr: 20000 },
  { id: "education", label: "Education", emoji: "", colorClass: "bg-cyan-500", defaultLimitInr: 5000 },
  { id: "travel", label: "Travel", emoji: "", colorClass: "bg-indigo-600", defaultLimitInr: 10000 },
  { id: "savings", label: "Savings", emoji: "", colorClass: "bg-emerald-600", defaultLimitInr: 10000 },
  { id: "other", label: "Other", emoji: "", colorClass: "bg-gray-500", defaultLimitInr: 2000 },
];

export function getBudgetCategoryMeta(categoryId: string): BudgetCategoryConfig {
  const found = BUDGET_CATEGORY_CONFIG.find((c) => c.id === categoryId);
  if (found) return found;
  return {
    id: "other",
    label: categoryId.replace(/_/g, " "),
    emoji: "",
    colorClass: "bg-gray-500",
    defaultLimitInr: 2000,
  };
}

export const ALERT_THRESHOLDS: ReadonlyArray<AlertThreshold> = [50, 75, 90, 100];
