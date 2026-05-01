export const APP_NAME = "Expense Management";

export const EXPENSE_CATEGORIES: ReadonlyArray<{ id: string; label: string; emoji: string }> = [
  { id: "food_dining", label: "Food & Dining", emoji: "" },
  { id: "transportation", label: "Transportation", emoji: "" },
  { id: "shopping", label: "Shopping", emoji: "" },
  { id: "entertainment", label: "Entertainment", emoji: "" },
  { id: "health", label: "Health", emoji: "" },
  { id: "education", label: "Education", emoji: "" },
  { id: "housing", label: "Housing", emoji: "" },
  { id: "utilities", label: "Utilities", emoji: "" },
  { id: "travel", label: "Travel", emoji: "" },
  { id: "personal_care", label: "Personal Care", emoji: "" },
  { id: "insurance", label: "Insurance", emoji: "" },
  { id: "investments", label: "Investments", emoji: "" },
  { id: "gifts", label: "Gifts", emoji: "" },
  { id: "business", label: "Business", emoji: "" },
  { id: "salary", label: "Salary", emoji: "" },
  { id: "freelance", label: "Freelance", emoji: "" },
  { id: "other", label: "Other", emoji: "" },
] as const;

const HUMAN_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  net_cash: "Net Cash",
  sort_by_date: "Sort by Date",
  year_to_date: "Year to Date",
  last_30_days: "Last 30 Days",
  calendar_month: "Calendar Month",
} as const;

function capitalizeWord(word: string): string {
  if (!word) return "";
  if (word.length <= 3 && word === word.toUpperCase()) return word;
  return `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`;
}

export function humanizeKey(rawValue: string): string {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return rawValue;

  const override = HUMAN_LABEL_OVERRIDES[normalized];
  if (override) return override;

  return normalized
    .split(/[_\s-]+/g)
    .map((part) => capitalizeWord(part))
    .join(" ");
}

export function getExpenseCategoryMeta(categoryId: string): { label: string; emoji: string } {
  const category = EXPENSE_CATEGORIES.find((item) => item.id === categoryId);
  if (category) return { label: category.label, emoji: category.emoji };
  return { label: humanizeKey(categoryId), emoji: "" };
}

export function getExpenseCategoryLabel(categoryId: string): string {
  return getExpenseCategoryMeta(categoryId).label;
}
