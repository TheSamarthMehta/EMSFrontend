import type { ExpenseRow } from "@/types/expense";
import { getBudgetCategoryMeta } from "@/features/budget/budgetConstants";
import { CHART_SLICE_COLORS } from "@/lib/chartPalette";
import { getExpenseCategoryMeta } from "@/lib/constants";

export type ReportTransactionType = "expense" | "income" | "transfer";

export interface ReportTransaction {
  id: string;
  type: ReportTransactionType;
  category: string;
  amount: number;
  date: string;
  note: string;
  tags: string[];
  source: "expense" | "income";
}

export type ReportGroupBy = "day" | "week" | "month";

export interface ReportFiltersState {
  type: "all" | "expense" | "income";
  from: string;
  to: string;
  category: string | "__all__";
  groupBy: ReportGroupBy;
  compareMode: boolean;
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatINRShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return formatINR(n);
}

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getDaysBetween(from: string, to: string): string[] {
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(toYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function getPreviousPeriod(from: string, to: string): { from: string; to: string } {
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - ms);
  return { from: toYmd(prevStart), to: toYmd(prevEnd) };
}

export function daysInclusive(from: string, to: string): number {
  return Math.max(1, getDaysBetween(from, to).length);
}

export function expenseRowToTransaction(e: ExpenseRow): ReportTransaction {
  const t = (e.type || "expense").toLowerCase();
  const type: ReportTransactionType = t === "income" ? "income" : t === "transfer" ? "transfer" : "expense";
  const d = typeof e.date === "string" ? e.date.slice(0, 10) : toYmd(new Date(e.date));
  return {
    id: e._id,
    type,
    category: e.category,
    amount: e.amount,
    date: d,
    note: [e.title, e.description].filter(Boolean).join(" — ") || e.title,
    tags: [],
    source: "expense",
  };
}

export function incomeRowToTransaction(e: ExpenseRow): ReportTransaction {
  const d = typeof e.date === "string" ? e.date.slice(0, 10) : toYmd(new Date(e.date));
  return {
    id: e._id,
    type: "income",
    category: e.category,
    amount: e.amount,
    date: d,
    note: [e.title, e.description].filter(Boolean).join(" — ") || e.title,
    tags: [],
    source: "income",
  };
}

export function filterTransactions(
  rows: ReportTransaction[],
  f: Pick<ReportFiltersState, "type" | "category">
): ReportTransaction[] {
  return rows.filter((r) => {
    if (f.type === "expense" && r.type !== "expense") return false;
    if (f.type === "income" && r.type !== "income") return false;
    if (f.category && f.category !== "__all__" && r.category !== f.category) return false;
    return true;
  });
}

export function filterByDateRange(rows: ReportTransaction[], from: string, to: string): ReportTransaction[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

export interface GroupedPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketKeyForTxn(t: ReportTransaction, groupBy: ReportGroupBy): string {
  const d = new Date(t.date + "T12:00:00");
  if (groupBy === "day") return t.date;
  if (groupBy === "week") return toYmd(startOfWeekMonday(d));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function groupTransactions(
  txns: ReportTransaction[],
  groupBy: ReportGroupBy,
  from: string,
  to: string
): GroupedPoint[] {
  const days = getDaysBetween(from, to);
  if (!days.length) return [];

  const acc = new Map<string, { income: number; expense: number }>();

  for (const t of txns) {
    if (t.date < from || t.date > to) continue;
    const key = bucketKeyForTxn(t, groupBy);
    const cur = acc.get(key) || { income: 0, expense: 0 };
    if (t.type === "income") cur.income += t.amount;
    else cur.expense += t.amount;
    acc.set(key, cur);
  }

  if (groupBy === "day") {
    return days.map((day) => {
      const d = new Date(day + "T12:00:00");
      const g = acc.get(day);
      return {
        key: day,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        income: g?.income ?? 0,
        expense: g?.expense ?? 0,
      };
    });
  }

  const keys = [...acc.keys()].sort((a, b) => a.localeCompare(b));
  return keys.map((key) => {
    const g = acc.get(key)!;
    let label = key;
    if (groupBy === "week") {
      const ws = new Date(key + "T12:00:00");
      label = `Week of ${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    } else if (groupBy === "month") {
      const d = new Date(key + "-01T12:00:00");
      label = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return { key, label, income: g.income, expense: g.expense };
  });
}

export function aggregateCategorySpend(txns: ReportTransaction[]): { category: string; total: number }[] {
  const m = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" && t.type !== "transfer") continue;
    m.set(t.category, (m.get(t.category) || 0) + t.amount);
  }
  return [...m.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function categoryLabel(cat: string): string {
  const b = getBudgetCategoryMeta(cat);
  if (b.label !== cat.replace(/_/g, " ")) return b.label;
  return getExpenseCategoryMeta(cat).label;
}

export function categoryEmoji(cat: string): string {
  return getBudgetCategoryMeta(cat).emoji || getExpenseCategoryMeta(cat).emoji;
}

const CHART_PALETTE = [...CHART_SLICE_COLORS];

export function categoryColor(idx: number): string {
  return CHART_PALETTE[idx % CHART_PALETTE.length];
}

export interface ReportSummaryComputed {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  transactionCount: number;
  avgPerDay: number;
  topCategory: string;
  savingsRate: number;
}

export function computeSummary(txns: ReportTransaction[], from: string, to: string): ReportSummaryComputed {
  const inRange = filterByDateRange(txns, from, to);
  let totalExpenses = 0;
  let totalIncome = 0;
  for (const t of inRange) {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpenses += t.amount;
  }
  const net = totalIncome - totalExpenses;
  const days = daysInclusive(from, to);
  const avgPerDay = totalExpenses / days;
  const byCat = aggregateCategorySpend(inRange);
  const topCategory = byCat[0]?.category ?? "—";
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 1000) / 10 : 0;
  return {
    totalExpenses,
    totalIncome,
    netSavings: net,
    transactionCount: inRange.length,
    avgPerDay,
    topCategory,
    savingsRate,
  };
}

export async function fetchAllPaged<T extends { data: unknown[]; pagination: { pages: number } }>(
  fetchPage: (page: number) => Promise<T>
): Promise<T["data"]> {
  const all: T["data"] = [] as T["data"];
  let page = 1;
  let pages = 1;
  do {
    const res = await fetchPage(page);
    all.push(...(res.data as never[]));
    pages = res.pagination.pages;
    page += 1;
  } while (page <= pages);
  return all;
}

export function exportTransactionsCsv(rows: ReportTransaction[], from: string, to: string): void {
  const header = ["Date", "Type", "Category", "Note", "Tags", "Amount"];
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.date, r.type, categoryLabel(r.category), esc(r.note), esc(r.tags.join(", ")), r.amount].join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function heatmapIntensityClass(amount: number, max: number): string {
  if (amount <= 0 || max <= 0) return "border border-white/10 bg-transparent";
  const pct = amount / max;
  if (pct < 0.25) return "bg-indigo-500/20";
  if (pct < 0.5) return "bg-indigo-500/40";
  if (pct < 0.75) return "bg-indigo-500/65";
  return "bg-indigo-500";
}

export interface InsightCard {
  id: string;
  icon: "trend" | "food" | "savings" | "drop";
  text: string;
  actionLabel?: string;
  actionHref?: string;
}

export function buildInsights(
  cur: ReportSummaryComputed,
  prev: { totalExpenses: number; totalIncome: number; netSavings: number; transactionCount: number } | null,
  byCat: { category: string; total: number }[],
  totalExp: number
): InsightCard[] {
  const out: InsightCard[] = [];
  if (prev && prev.totalExpenses > 0) {
    const ch = Math.round(((cur.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100);
    if (ch <= -5) {
      out.push({
        id: "drop",
        icon: "drop",
        text: `Expenses dropped ${Math.abs(ch)}% vs the previous period — solid progress.`,
      });
    } else if (ch >= 5) {
      out.push({
        id: "up",
        icon: "trend",
        text: `Expenses rose ${ch}% vs the previous period — worth a quick review.`,
      });
    }
  }
  const top = byCat[0];
  if (top && totalExp > 0) {
    const pct = Math.round((top.total / totalExp) * 100);
    out.push({
      id: "topcat",
      icon: "food",
      text: `${categoryLabel(top.category)} is ${pct}% of expenses (${formatINR(Math.round(top.total))}).`,
      actionLabel: "View budget",
      actionHref: "/budget",
    });
  }
  if (cur.totalIncome > 0) {
    out.push({
      id: "save",
      icon: "savings",
      text: `You saved ${cur.savingsRate}% of income in this range (${formatINR(Math.round(cur.netSavings))} net).`,
    });
  }
  if (out.length === 0) {
    out.push({
      id: "neutral",
      icon: "trend",
      text: "Add a few more transactions to unlock richer insights for this period.",
    });
  }
  return out.slice(0, 3);
}

export interface SavedPreset {
  id: string;
  name: string;
  filters: ReportFiltersState;
  savedAt: string;
}

export const PRESETS_STORAGE_KEY = "spendwise-report-presets-v1";
