import type { BudgetSummaryCategory } from "@/types/budget";
import { getBudgetCategoryMeta } from "@/features/budget/budgetConstants";

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** `month` is 1–12 */
export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getSpentPercent(line: {
  spent: number;
  limit: number;
  rolloverAmount?: number;
}): number {
  const rollover = line.rolloverAmount ?? 0;
  const effectiveLimit = line.limit + rollover;
  if (effectiveLimit <= 0) return 0;
  return Math.min(100, (line.spent / effectiveLimit) * 100);
}

export function getProgressColorClass(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-orange-500";
  if (pct >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

export function isViewingCurrentMonth(year: number, month1to12: number): boolean {
  const n = new Date();
  return n.getFullYear() === year && n.getMonth() + 1 === month1to12;
}

export function getCalendarDayOfMonth(): number {
  return new Date().getDate();
}

export function projectMonthEndTotalSpent(totalSpentSoFar: number, year: number, month1to12: number): number {
  if (!isViewingCurrentMonth(year, month1to12)) return totalSpentSoFar;
  const dim = daysInMonth(year, month1to12);
  const dom = getCalendarDayOfMonth();
  if (dom <= 0) return totalSpentSoFar;
  const daily = totalSpentSoFar / dom;
  return daily * dim;
}

export type ForecastLabel = "on-track" | "near-limit" | "over";

export function getCategoryForecast(
  line: Pick<BudgetSummaryCategory, "spent" | "limit" | "rolloverAmount">,
  year: number,
  month1to12: number
): { projected: number; effectiveLimit: number; overBy: number; label: ForecastLabel; tooltip: string } {
  const rollover = line.rolloverAmount ?? 0;
  const effectiveLimit = line.limit + rollover;
  if (!isViewingCurrentMonth(year, month1to12)) {
    return {
      projected: line.spent,
      effectiveLimit,
      overBy: 0,
      label: "on-track",
      tooltip: "Forecast is available for the current month only.",
    };
  }
  const dom = getCalendarDayOfMonth();
  const dim = daysInMonth(year, month1to12);
  const dailyRate = dom > 0 ? line.spent / dom : 0;
  const projected = dailyRate * dim;
  const overBy = projected - effectiveLimit;
  let label: ForecastLabel = "on-track";
  if (overBy > 0) label = "over";
  else if (getSpentPercent({ spent: projected, limit: line.limit, rolloverAmount: rollover }) >= 85) {
    label = "near-limit";
  }
  const tooltip =
    label === "over"
      ? `At this pace you may exceed the budget by about ${formatINR(Math.max(0, Math.round(overBy)))} by month-end.`
      : label === "near-limit"
        ? "Spending pace is high — you are approaching your effective limit by month-end."
        : "Spending pace looks sustainable for this category.";
  return { projected, effectiveLimit, overBy, label, tooltip };
}

export function exportBudgetCsv(rows: BudgetSummaryCategory[]): string {
  const header = ["Category", "Limit", "Spent", "Remaining", "% Used", "Note"];
  const lines = rows.map((r) => {
    const rollover = r.rolloverAmount ?? 0;
    const effective = r.limit + rollover;
    const pct = effective > 0 ? Math.round((r.spent / effective) * 1000) / 10 : 0;
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const name = getBudgetCategoryMeta(r.category).label;
    return [esc(name), r.limit, r.spent, r.remaining, pct, esc(r.note || "")].join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
