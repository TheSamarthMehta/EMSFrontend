import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Database,
  Loader2,
  TrendingUp,
  Wand2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { postExpense } from "@/api/expenses";
import { postDashboardSeedDemo } from "@/api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/hooks/useDashboard";
import { useBudgetSummary } from "@/hooks/useBudgetData";
import { useSession } from "@/hooks/useSession";
import { useI18n } from "@/context/LanguageContext";
import { useAiParseExpense } from "@/hooks/useAi";
import { SmartInsightsCard } from "@/features/dashboard/SmartInsightsCard";
import { groupTopN } from "@/lib/chartGrouping";
import {
  EXPENSE_CATEGORIES,
  getExpenseCategoryMeta,
  humanizeKey,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/formatCurrency";
import { CHART_SLICE_COLORS } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

const PIE_COLORS = [...CHART_SLICE_COLORS];

const RECURRING_DEMO = [
  { name: "Rent", amount: 18500, nextDue: "May 1, 2026", cadence: "Monthly" },
  { name: "Netflix", amount: 649, nextDue: "Apr 28, 2026", cadence: "Monthly" },
  { name: "Gym", amount: 1200, nextDue: "Apr 25, 2026", cadence: "Monthly" },
];

function presetApiValue(tab: string): string {
  if (tab === "30d") return "30d";
  if (tab === "year") return "year";
  return "month";
}

function humanPresetLabel(preset: string): string {
  switch (preset) {
    case "calendar_month":
      return "This month";
    case "last_30_days":
      return "Last 30 days";
    case "year_to_date":
      return "Year to date";
    default:
      return humanizeKey(preset);
  }
}

function categoryLabel(id: string): string {
  const category = getExpenseCategoryMeta(id);
  return category.label;
}

const showDemoSeed =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_SEED === "true";

const cardShell =
  "rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--soft-shadow)] hover:border-white/12 hover:shadow-[var(--soft-shadow-hover)]";
const chartBg = "rounded-[var(--radius)] border border-border bg-card";

export default function DashboardPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useSession();
  const [periodTab, setPeriodTab] = useState("month");
  const [timelineDays, setTimelineDays] = useState(30);
  const [chartRange, setChartRange] = useState<DateRange | undefined>();
  const [rangeOpen, setRangeOpen] = useState(false);
  const [cashMode, setCashMode] = useState<"line" | "bar">("line");
  const [compareMode, setCompareMode] = useState<"bar" | "line">("bar");

  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState(EXPENSE_CATEGORIES[0]?.id ?? "other");
  const [quickNote, setQuickNote] = useState("");
  const [quickDate, setQuickDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const chartParams = useMemo(() => {
    if (chartRange?.from && chartRange?.to) {
      return {
        chartFrom: format(chartRange.from, "yyyy-MM-dd"),
        chartTo: format(chartRange.to, "yyyy-MM-dd"),
      };
    }
    return {};
  }, [chartRange]);

  const preset = presetApiValue(periodTab);
  const { data, isPending, isError, error } = useDashboard({
    preset,
    timelineDays,
    ...chartParams,
  });

  const currency = user?.currency ?? "INR";
  const now = new Date();
  const budgetQ = useBudgetSummary(now.getFullYear(), now.getMonth() + 1);

  const lineData = useMemo(() => {
    if (!data?.timeline.mergedDaily?.length) return [];
    return data.timeline.mergedDaily.map((row) => ({
      label: format(new Date(row.date), "MMM d"),
      short: format(new Date(row.date), "M/d"),
      expense: row.expense,
      income: row.income,
    }));
  }, [data]);

  const pieRaw = useMemo(() => {
    if (!data?.topExpenseCategories.length) return [];
    return data.topExpenseCategories.map((c) => ({
      name: categoryLabel(c.category),
      rawCategory: c.category,
      value: c.total,
      count: c.count,
    }));
  }, [data]);

  /** Top 6 visible + "Other" bucket — keeps the donut readable past ~7 categories. */
  const pieGrouped = useMemo(() => groupTopN(pieRaw, 6), [pieRaw]);
  const pieData = pieGrouped.data;

  const seedMut = useMutation({
    mutationFn: postDashboardSeedDemo,
    onSuccess: async (res) => {
      toast.success(
        `Added ${res.expensesCreated} expenses and ${res.incomesCreated} income entries`
      );
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not load sample data"));
    },
  });

  const quickMut = useMutation({
    mutationFn: () =>
      postExpense({
        title: quickNote.trim() || categoryLabel(quickCategory),
        amount: Number.parseFloat(quickAmount.replace(/,/g, "")) || 0,
        category: quickCategory,
        description: quickNote.trim() || "Quick add from dashboard",
        date: new Date(quickDate).toISOString(),
      }),
    onSuccess: async () => {
      toast.success("Expense added");
      setQuickAmount("");
      setQuickNote("");
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["expenses"] });
      await qc.invalidateQueries({ queryKey: ["budget-summary"] });
      await qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not add expense"));
    },
  });

  const submitQuick = useCallback(() => {
    const n = Number.parseFloat(quickAmount.replace(/,/g, "")) || 0;
    if (n <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    quickMut.mutate();
  }, [quickAmount, quickMut]);

  const aiParse = useAiParseExpense();
  const parseQuickWithAi = useCallback(() => {
    const text = quickNote.trim();
    if (!text) {
      toast.error("Type something in the Note field first (e.g. 'spent 350 on uber to airport yesterday').");
      return;
    }
    aiParse.mutate(
      { text },
      {
        onSuccess: (res) => {
          if (!res.enabled) {
            toast.error("AI is not configured on the server.");
            return;
          }
          if (!res.draft) {
            toast.error("Couldn't parse that — try wording it differently.");
            return;
          }
          setQuickAmount(String(res.draft.amount));
          setQuickCategory(res.draft.category);
          setQuickNote(res.draft.title);
          setQuickDate(res.draft.date);
          toast.success(
            `Parsed: ${res.draft.title} · ${formatCurrency(res.draft.amount, currency)}`
          );
        },
        onError: (e: unknown) => {
          toast.error(getApiErrorMessage(e, "AI couldn't parse the text"));
        },
      }
    );
  }, [aiParse, quickNote, currency]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[12px]" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-[12px]" />
        <Skeleton className="h-96 w-full rounded-[12px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive text-[13px]" role="alert">
        {getApiErrorMessage(error, "Could not load dashboard")}
      </p>
    );
  }

  const { summary, topExpenseCategories, insights, monthlyComparison, recentTransactions } = data;
  const xInterval = lineData.length > 24 ? Math.floor(lineData.length / 10) : 0;

  const budgetTotals = budgetQ.data?.totals;
  const budgetUsed = budgetTotals?.totalSpentOnBudgetedCategories ?? 0;
  const budgetLimit = budgetTotals?.totalEffectiveLimit ?? budgetTotals?.totalLimit ?? 0;
  const budgetPct =
    budgetLimit > 0 ? Math.min(100, Math.round((budgetUsed / budgetLimit) * 1000) / 10) : 0;

  const savingsPct =
    summary.savingsRate != null ? (summary.savingsRate * 100).toFixed(1) : null;
  const prevSavingsPct =
    summary.savingsRatePrevious != null
      ? (summary.savingsRatePrevious * 100).toFixed(1)
      : null;
  const savingsDelta =
    summary.savingsRate != null && summary.savingsRatePrevious != null
      ? (summary.savingsRate - summary.savingsRatePrevious) * 100
      : null;

  return (
    <div className="min-w-0 space-y-3 text-xs leading-relaxed">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">{t("page.dashboard.title")}</h1>
          <p className="text-muted-foreground text-[11px]">
            {humanPresetLabel(data.preset)} · {t("page.dashboard.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Tabs
            value={periodTab}
            onValueChange={(v) => v && setPeriodTab(v)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid h-7 w-full grid-cols-3 sm:w-auto sm:inline-flex">
              <TabsTrigger value="month" className="text-[11px] transition-colors duration-200">
                Month
              </TabsTrigger>
              <TabsTrigger value="30d" className="text-[11px] transition-colors duration-200">
                30 days
              </TabsTrigger>
              <TabsTrigger value="year" className="text-[11px] transition-colors duration-200">
                YTD
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground whitespace-nowrap text-[11px]">Range</span>
            <Select
              value={String(timelineDays)}
              onValueChange={(v) => setTimelineDays(Number.parseInt(v ?? "30", 10) || 30)}
            >
              <SelectTrigger className="h-7 w-[100px] text-[11px] transition-shadow duration-200 hover:shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="date-range-picker">
            <DateRangePicker
              value={chartRange}
              onChange={setChartRange}
              open={rangeOpen}
              onOpenChange={setRangeOpen}
              align="end"
              numberOfMonths={2}
            />
          </div>
          <div className="inline-flex overflow-hidden rounded-md shadow-sm">
            <Button
              id="add-expense-btn"
              type="button"
              size="sm"
              className="h-7 rounded-r-none px-2.5 text-[11px] transition-shadow duration-200 hover:shadow-md"
              onClick={() => navigate("/expenses")}
            >
              + Add Expense
            </Button>
            {showDemoSeed ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 rounded-l-none border-l border-border/80 bg-muted/40 px-2 text-[11px] transition-all duration-200 hover:bg-muted hover:text-foreground"
                disabled={seedMut.isPending}
                onClick={() => seedMut.mutate()}
              >
                <Database className="mr-0.5 size-3" />
                Load sample
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="summary-cards grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className={cn(cardShell, "budget-progress-bar border-l-2 border-l-indigo-500/70 p-2.5 sm:p-3")}>
          <CardHeader className="p-0 pb-0.5">
            <CardDescription className="text-[10px] uppercase tracking-wide text-muted-foreground">Income</CardDescription>
            <CardTitle className="text-sm font-semibold leading-tight tabular-nums tracking-tight">
              {formatCurrency(summary.income.total, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-[10px]">
              {summary.income.transactions ?? 0} txns ·{" "}
              {summary.income.changePercent >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(summary.income.changePercent)}%
            </p>
          </CardContent>
        </Card>
        <Card className={cn(cardShell, "border-l-2 border-l-indigo-500/70 p-2.5 sm:p-3")}>
          <CardHeader className="p-0 pb-0.5">
            <CardDescription className="text-[10px] uppercase tracking-wide text-muted-foreground">Expenses</CardDescription>
            <CardTitle className="text-sm font-semibold leading-tight tabular-nums tracking-tight">
              {formatCurrency(summary.expense.total, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-[10px]">
              {summary.expense.transactions ?? 0} txns ·{" "}
              {summary.expense.changePercent >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(summary.expense.changePercent)}%
            </p>
          </CardContent>
        </Card>
        <Card className={cn(cardShell, "border-l-2 border-l-indigo-500/70 p-2.5 sm:p-3")}>
          <CardHeader className="p-0 pb-0.5">
            <CardDescription className="text-[10px] uppercase tracking-wide text-muted-foreground">Net cash flow</CardDescription>
            <CardTitle className="text-sm font-semibold leading-tight tabular-nums tracking-tight">
              {formatCurrency(summary.net.total, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-[10px]">
              {summary.net.changePercent >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(summary.net.changePercent)}%
            </p>
          </CardContent>
        </Card>
        <Card className={cn(cardShell, "border-l-2 border-l-indigo-500/70 p-2.5 sm:p-3")}>
          <CardHeader className="p-0 pb-0.5">
            <CardDescription className="text-[10px] uppercase tracking-wide text-muted-foreground">Top category</CardDescription>
            <CardTitle className="line-clamp-2 text-xs font-semibold leading-snug">
              {topExpenseCategories[0] ? categoryLabel(topExpenseCategories[0].category) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-[10px] tabular-nums">
              {topExpenseCategories[0]
                ? formatCurrency(topExpenseCategories[0].total, currency)
                : "No expense data"}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(cardShell, "border-l-2 border-l-indigo-500/70 p-2.5 sm:p-3")}>
          <CardHeader className="p-0 pb-0.5">
            <CardDescription className="text-[10px] uppercase tracking-wide text-muted-foreground">Budget used</CardDescription>
            <CardTitle className="text-sm font-semibold leading-tight tabular-nums tracking-tight">
              {formatCurrency(budgetUsed, currency)}
              <span className="text-muted-foreground text-[10px] font-medium">
                {" "}
                / {formatCurrency(budgetLimit, currency)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pt-1">
            <div className="bg-muted h-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${budgetLimit > 0 ? Math.min(100, budgetPct) : 0}%` }}
              />
            </div>
            <p className="text-muted-foreground text-[10px]">
              {budgetLimit > 0 ? `${budgetPct.toFixed(0)}% used` : "No budgets set"}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(cardShell, "border-l-2 border-l-indigo-500/70 p-2.5 sm:p-3")}>
          <CardHeader className="p-0 pb-0.5">
            <CardDescription className="text-[10px] uppercase tracking-wide text-muted-foreground">Savings rate</CardDescription>
            <CardTitle className="flex items-baseline gap-1 text-sm font-semibold tabular-nums">
              {savingsPct != null ? `${savingsPct}%` : "—"}
              {savingsDelta != null ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] font-semibold",
                    savingsDelta >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {savingsDelta >= 0 ? (
                    <ArrowUpRight className="size-2.5" />
                  ) : (
                    <ArrowDownRight className="size-2.5" />
                  )}
                  {Math.abs(savingsDelta).toFixed(1)}pp
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-[10px]">
              {prevSavingsPct != null ? `Prior ${prevSavingsPct}%` : "No prior data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
        <CardHeader className="px-0 pb-2 pt-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Quick add expense</CardTitle>
              <CardDescription className="text-[10px]">
                Type natural text in <span className="text-foreground">Note</span> and click Auto-fill.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-7 gap-1.5 px-2 text-[11px]"
              disabled={aiParse.isPending}
              onClick={parseQuickWithAi}
              aria-label="Auto-fill expense fields from note text"
            >
              {aiParse.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Wand2 className="size-3 text-foreground/70" />
              )}
              Auto-fill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            {/* Amount */}
            <div className="flex flex-col gap-1 min-w-[90px] sm:w-[110px] shrink-0">
              <Label htmlFor="qa-amt" className="text-[11px] leading-none">Amount (₹)</Label>
              <Input
                id="qa-amt"
                inputMode="decimal"
                placeholder="0.00"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              />
            </div>
            {/* Category */}
            <div className="flex flex-col gap-1 min-w-[140px] flex-1">
              <Label className="text-[11px] leading-none">Category</Label>
              <Select value={quickCategory} onValueChange={(v) => v && setQuickCategory(v)}>
                <SelectTrigger className="h-[var(--control-height)] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Note */}
            <div className="flex flex-col gap-1 flex-[2] min-w-[180px]">
              <Label htmlFor="qa-note" className="text-[11px] leading-none">Note</Label>
              <Input
                id="qa-note"
                placeholder="e.g. spent 350 on uber to airport yesterday"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
              />
            </div>
            {/* Date */}
            <div className="flex flex-col gap-1 min-w-[130px] shrink-0">
              <Label htmlFor="qa-date" className="text-[11px] leading-none">Date</Label>
              <DatePicker
                id="qa-date"
                value={quickDate}
                onChange={setQuickDate}
                placeholder="Pick date"
                align="start"
              />
            </div>
            {/* Submit */}
            <Button
              type="button"
              className="shrink-0 self-end px-4 transition-all duration-200 hover:shadow-md"
              disabled={quickMut.isPending}
              onClick={submitQuick}
            >
              + Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <SmartInsightsCard />

      <div className="grid gap-2 sm:grid-cols-2">
        <Card className={cn(cardShell, "category-breakdown-chart p-2.5 sm:p-3")}>
          <CardHeader className="px-0 pb-1.5 pt-0">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="text-primary size-3" />
              <CardTitle className="text-xs font-semibold">Avg. daily spend</CardTitle>
            </div>
            <CardDescription className="text-[10px]">
              Personal expenses ÷ {insights.periodDays} days
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-0">
            <p className="text-foreground text-sm font-semibold tabular-nums">
              {formatCurrency(insights.avgDailyExpense, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
          <CardHeader className="px-0 pb-1.5 pt-0">
            <CardTitle className="text-xs font-semibold">Largest expense</CardTitle>
            <CardDescription className="text-[10px]">
              Single biggest expense this period
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-0">
            {insights.biggestExpense ? (
              <div className="space-y-0.5">
                <p className="text-foreground text-[11px] font-medium leading-snug">
                  {insights.biggestExpense.title}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {categoryLabel(insights.biggestExpense.category)} ·{" "}
                  {format(new Date(insights.biggestExpense.date), "MMM d, yyyy")}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(insights.biggestExpense.amount, currency)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-[10px]">No expenses in this range</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn(cardShell, "recent-expenses p-2.5 sm:p-3")}>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xs font-semibold sm:text-sm">Daily cash flow</CardTitle>
            <CardDescription className="text-[10px]">
              Income vs personal expenses — {data.timeline.days} days
            </CardDescription>
          </div>
          <Tabs value={cashMode} onValueChange={(v) => v && setCashMode(v as "line" | "bar")}>
            <TabsList className="h-7">
              <TabsTrigger value="line" className="px-2.5 text-[11px]">
                Line
              </TabsTrigger>
              <TabsTrigger value="bar" className="px-2.5 text-[11px]">
                Bar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardContent className={cn("min-h-[240px] w-full p-2 sm:p-3", chartBg)}>
          <ResponsiveContainer width="100%" height={240}>
            {cashMode === "line" ? (
              <LineChart data={lineData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="short"
                  tick={{ fontSize: 11 }}
                  interval={xInterval}
                  angle={lineData.length > 20 ? -30 : 0}
                  textAnchor={lineData.length > 20 ? "end" : "middle"}
                  height={lineData.length > 20 ? 50 : 30}
                />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: "8px" }}
                  labelFormatter={(_, payload) => {
                    const row = Array.isArray(payload) ? payload[0]?.payload : undefined;
                    return row && typeof row === "object" && "label" in row
                      ? String((row as { label: string }).label)
                      : "";
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0), currency),
                    String(name) === "expense" ? "Expense" : "Income",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Expenses"
                  stroke="#e11d48"
                  strokeWidth={2}
                  dot={lineData.length < 20}
                  connectNulls
                  isAnimationActive
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={lineData.length < 20}
                  connectNulls
                  isAnimationActive
                  animationDuration={900}
                />
              </LineChart>
            ) : (
              <BarChart data={lineData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="short"
                  tick={{ fontSize: 11 }}
                  interval={xInterval}
                  angle={lineData.length > 20 ? -30 : 0}
                  textAnchor={lineData.length > 20 ? "end" : "middle"}
                  height={lineData.length > 20 ? 50 : 30}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px" }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0), currency),
                    String(name) === "expense" ? "Expense" : "Income",
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#059669"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationDuration={800}
                />
                <Bar
                  dataKey="expense"
                  name="Expenses"
                  fill="#e11d48"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationDuration={800}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-2 lg:grid-cols-2">
        <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
          <CardHeader className="px-0 pb-2 pt-0">
            <CardTitle className="text-xs font-semibold sm:text-sm">Spending by category</CardTitle>
            <CardDescription className="text-[10px]">Share of personal expenses this period</CardDescription>
          </CardHeader>
          <CardContent className={cn("min-h-[260px] px-0 pb-0 pt-0", pieData.length ? "p-3 " + chartBg : "")}>
            {pieData.length === 0 ? (
              <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
                <p className="text-muted-foreground max-w-xs text-xs">
                  Add expenses or load sample data to see the breakdown.
                </p>
                {showDemoSeed ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => seedMut.mutate()}>
                    Load sample data
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid items-center gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                <div className="relative h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={84}
                        paddingAngle={1.5}
                        stroke="transparent"
                        isAnimationActive
                        animationDuration={700}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={false}
                        formatter={(value, _n, item) => {
                          const payload = item?.payload as { count?: number; name?: string };
                          const c = payload?.count != null && payload.count > 0 ? ` · ${payload.count} txns` : "";
                          return [
                            `${formatCurrency(Number(value ?? 0), currency)}${c}`,
                            payload?.name ?? "",
                          ];
                        }}
                        contentStyle={{
                          background: "var(--chart-tooltip-bg)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(pieGrouped.total, currency)}
                    </span>
                  </div>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {pieData.map((row, i) => {
                    const pct = pieGrouped.total > 0
                      ? Math.round((row.value / pieGrouped.total) * 1000) / 10
                      : 0;
                    return (
                      <li
                        key={row.rawCategory}
                        className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-[11px]"
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate text-foreground/90">{row.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {pct}% · {formatCurrency(row.value, currency)}
                        </span>
                      </li>
                    );
                  })}
                  {pieGrouped.truncated ? (
                    <li className="mt-1 text-[10px] text-muted-foreground/70">
                      Top 5 categories shown · {pieGrouped.hiddenCount} more grouped under Other.
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xs font-semibold sm:text-sm">6-month comparison</CardTitle>
              <CardDescription className="text-[10px]">Income vs expenses by month</CardDescription>
            </div>
            <Tabs value={compareMode} onValueChange={(v) => v && setCompareMode(v as "bar" | "line")}>
              <TabsList className="h-7">
                <TabsTrigger value="bar" className="px-2.5 text-[11px]">
                  Bars
                </TabsTrigger>
                <TabsTrigger value="line" className="px-2.5 text-[11px]">
                  Lines
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardContent className={cn("min-h-[220px] w-full p-2 sm:p-3", chartBg)}>
            <ResponsiveContainer width="100%" height={240}>
              {compareMode === "bar" ? (
                <ComposedChart data={monthlyComparison} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expenses"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net savings"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive
                    animationDuration={900}
                  />
                </ComposedChart>
              ) : (
                <LineChart data={monthlyComparison} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    animationDuration={900}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Expenses"
                    stroke="#e11d48"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    animationDuration={900}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net savings"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive
                    animationDuration={900}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {topExpenseCategories.length > 0 && (
        <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
          <CardHeader className="px-0 pb-2 pt-0">
            <CardTitle className="text-xs font-semibold sm:text-sm">Category leaderboard</CardTitle>
            <CardDescription className="text-[10px]">
              Ranked by amount — {humanPresetLabel(data.preset).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-0">
            <ul className="space-y-2.5">
              {topExpenseCategories.map((c, i) => {
                const max = topExpenseCategories[0]?.total || 1;
                const pct = Math.min(100, Math.round((c.total / max) * 100));
                return (
                  <li key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="text-foreground font-medium">
                        <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                        {categoryLabel(c.category)}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatCurrency(c.total, currency)} · {c.count} txns
                      </span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-semibold sm:text-sm">Recent transactions</CardTitle>
          <Link
            to="/expenses"
            className="export-btn text-primary text-[11px] font-medium underline-offset-4 transition-colors duration-200 hover:underline"
          >
            View all →
          </Link>
        </div>
        <CardContent className="px-0 pb-0 pt-0">
          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-[13px]">
              No transactions yet — add an expense or load sample data to populate this list.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {recentTransactions.map((tx) => (
                  <article key={`${tx.type}-${tx.id}`} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{tx.title}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(tx.amount, currency)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(tx.date), "MMM d, yyyy")}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {categoryLabel(tx.category)}
                      </Badge>
                      <Badge variant={tx.type === "income" ? "default" : "outline"} className="text-xs font-medium">
                        {tx.type === "income" ? "Income" : "Expense"}
                      </Badge>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[13px]">Date</TableHead>
                      <TableHead className="text-[13px]">Description</TableHead>
                      <TableHead className="text-[13px]">Category</TableHead>
                      <TableHead className="text-right text-[13px]">Amount</TableHead>
                      <TableHead className="text-[13px]">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx) => (
                      <TableRow
                        key={`${tx.type}-${tx.id}`}
                        className="transition-colors duration-200 hover:bg-muted/50"
                      >
                        <TableCell className="text-[13px] tabular-nums">
                          {format(new Date(tx.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-[13px] font-medium">
                          {tx.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[13px] font-normal">
                            {categoryLabel(tx.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                          {formatCurrency(tx.amount, currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.type === "income" ? "default" : "outline"}
                            className={cn(
                              "text-[13px] font-medium",
                              tx.type === "income" && "border-emerald-600/30 bg-emerald-600/15 text-emerald-800 dark:text-emerald-200"
                            )}
                          >
                            {tx.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-0 pb-2 pt-0">
          <div>
            <CardTitle className="text-xs font-semibold sm:text-sm">Budget overview this month</CardTitle>
            <CardDescription className="text-[10px]">Spending against limits you set per category</CardDescription>
          </div>
          <Link
            to="/budget"
            className="text-primary shrink-0 text-[11px] font-medium underline-offset-4 hover:underline"
          >
            Set budgets →
          </Link>
        </CardHeader>
        <CardContent className="space-y-2 px-0 pb-0 pt-0">
          {!budgetQ.data?.categories?.length ? (
            <p className="text-muted-foreground text-[13px]">
              No category budgets for this month.{" "}
              <Link to="/budget" className="text-primary font-medium underline-offset-4 hover:underline">
                Set budgets →
              </Link>
            </p>
          ) : (
            budgetQ.data.categories.map((row) => {
              const u = row.utilizationPercent;
              const barColor =
                u < 70 ? "bg-emerald-500" : u < 90 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={row._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-medium">
                    <span className="truncate">{categoryLabel(row.category)}</span>
                  </div>
                  <div className="min-w-0 flex-[2] space-y-1">
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", barColor)}
                        style={{ width: `${Math.min(100, u)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 text-[13px] sm:w-52 sm:flex-col sm:items-end sm:justify-center sm:gap-0">
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(row.spent, currency)} / {formatCurrency(row.limit, currency)}
                    </span>
                    <span className="font-semibold tabular-nums">{u.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className={cn(cardShell, "p-2.5 sm:p-3")}>
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left transition-opacity duration-200 hover:opacity-90">
            <div>
              <CardTitle className="text-xs font-semibold sm:text-sm">Recurring expenses</CardTitle>
              <CardDescription className="text-[10px]">Illustrative list — connect bank sync later</CardDescription>
            </div>
            <ChevronDown className="text-muted-foreground size-5 shrink-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {RECURRING_DEMO.map((r) => (
                <li
                  key={r.name}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-[13px] transition-colors duration-200 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-muted-foreground text-[13px]">
                      Next {r.nextDue} · {r.cadence}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatCurrency(r.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
