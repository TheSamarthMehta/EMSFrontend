import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/context/LanguageContext";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Download,
  FileDown,
  Lightbulb,
  Loader2,
  Printer,
  Save,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { downloadTransactionsCsv } from "@/api/reports";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { useReportsSummary } from "@/hooks/useReportsSummary";
import {
  aggregateCategorySpend,
  buildInsights,
  categoryColor,
  categoryLabel,
  computeSummary,
  exportTransactionsCsv,
  filterByDateRange,
  filterTransactions,
  formatINR,
  formatINRShort,
  getDaysBetween,
  getPreviousPeriod,
  groupTransactions,
  heatmapIntensityClass,
  PRESETS_STORAGE_KEY,
  type ReportFiltersState,
  type ReportGroupBy,
  type ReportTransaction,
  type SavedPreset,
  toYmd,
} from "@/features/reports/reportUtils";
import { useReportDataset } from "@/features/reports/useReportDataset";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

function todayRange(): { from: string; to: string } {
  const t = new Date();
  const start = new Date(t.getFullYear(), t.getMonth(), 1);
  return { from: toYmd(start), to: toYmd(t) };
}

const PRESET_DEFS: { id: string; label: string; apply: () => { from: string; to: string } }[] = [
  {
    id: "today",
    label: "Today",
    apply: () => {
      const t = toYmd(new Date());
      return { from: t, to: t };
    },
  },
  {
    id: "week",
    label: "This week",
    apply: () => {
      const n = new Date();
      const d = n.getDay();
      const diff = d === 0 ? 6 : d - 1;
      const mon = new Date(n);
      mon.setDate(n.getDate() - diff);
      return { from: toYmd(mon), to: toYmd(n) };
    },
  },
  {
    id: "month",
    label: "This month",
    apply: () => todayRange(),
  },
  {
    id: "lastmonth",
    label: "Last month",
    apply: () => {
      const n = new Date();
      const first = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const last = new Date(n.getFullYear(), n.getMonth(), 0);
      return { from: toYmd(first), to: toYmd(last) };
    },
  },
  {
    id: "3m",
    label: "Last 3 months",
    apply: () => {
      const n = new Date();
      const start = new Date(n);
      start.setMonth(start.getMonth() - 3);
      return { from: toYmd(start), to: toYmd(n) };
    },
  },
  {
    id: "ytd",
    label: "This year",
    apply: () => {
      const n = new Date();
      const start = new Date(n.getFullYear(), 0, 1);
      return { from: toYmd(start), to: toYmd(n) };
    },
  },
];

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as SavedPreset[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function savePresets(presets: SavedPreset[]) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

export default function ReportsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const initial = todayRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [activePresetId, setActivePresetId] = useState<string>("month");
  const [type, setType] = useState<ReportFiltersState["type"]>("all");
  const [category, setCategory] = useState<string>("__all__");
  const [groupBy, setGroupBy] = useState<ReportGroupBy>("day");
  const [compareMode, setCompareMode] = useState(false);
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets());
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof ReportTransaction | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 20;

  const summaryFilters = useMemo(
    () => ({
      type,
      from,
      to,
      ...(category && category !== "__all__" ? { category } : {}),
    }),
    [type, from, to, category]
  );

  const prevRange = useMemo(() => getPreviousPeriod(from, to), [from, to]);
  const prevSummaryFilters = useMemo(
    () => ({
      type,
      from: prevRange.from,
      to: prevRange.to,
      ...(category && category !== "__all__" ? { category } : {}),
    }),
    [type, prevRange.from, prevRange.to, category]
  );

  const sumCur = useReportsSummary(summaryFilters);
  const sumPrev = useReportsSummary(prevSummaryFilters, { enabled: Boolean(from && to) });

  const { data: rawTx = [], isPending: txPending, isFetching: txFetching } = useReportDataset(from, to);
  const prevDataset = useReportDataset(compareMode ? prevRange.from : "", compareMode ? prevRange.to : "");

  const filtered = useMemo(() => {
    let rows = filterByDateRange(rawTx, from, to);
    rows = filterTransactions(rows, { type, category });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.note.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return rows;
  }, [rawTx, from, to, type, category, search]);

  const summary = useMemo(() => computeSummary(filtered, from, to), [filtered, from, to]);
  const byCat = useMemo(() => aggregateCategorySpend(filtered), [filtered]);
  const chartData = useMemo(() => groupTransactions(filtered, groupBy, from, to), [filtered, groupBy, from, to]);
  const chartPrev = useMemo(() => {
    if (!compareMode || !prevDataset.data?.length) return [];
    const rows = filterTransactions(filterByDateRange(prevDataset.data, prevRange.from, prevRange.to), {
      type,
      category,
    });
    return groupTransactions(rows, groupBy, prevRange.from, prevRange.to);
  }, [compareMode, prevDataset.data, groupBy, prevRange.from, prevRange.to, type, category]);

  const chartMerged = useMemo(() => {
    if (!compareMode || !chartPrev.length) return chartData.map((d) => ({ ...d, expensePrev: 0, incomePrev: 0 }));
    const map = new Map(chartPrev.map((p) => [p.key, p]));
    return chartData.map((d, i) => {
      const p = map.get(d.key) ?? chartPrev[i] ?? { expense: 0, income: 0 };
      return { ...d, expensePrev: p.expense, incomePrev: p.income };
    });
  }, [chartData, chartPrev, compareMode]);

  const expenseByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filtered) {
      if (t.type !== "expense" && t.type !== "transfer") continue;
      m.set(t.date, (m.get(t.date) || 0) + t.amount);
    }
    return m;
  }, [filtered]);

  const heatmapMax = useMemo(() => Math.max(1, ...[...expenseByDay.values()]), [expenseByDay]);

  const insights = useMemo(() => {
    const prevAgg =
      sumPrev.data != null
        ? {
            totalExpenses: sumPrev.data.expense.total,
            totalIncome: sumPrev.data.income.total,
            netSavings: sumPrev.data.net,
            transactionCount: sumPrev.data.expense.count + sumPrev.data.income.count,
            avgPerDay: 0,
            topCategory: "—",
            savingsRate: 0,
          }
        : null;
    return buildInsights(summary, prevAgg, byCat, summary.totalExpenses);
  }, [summary, sumPrev.data, byCat, summary.totalExpenses]);

  const sortedRows = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey as keyof ReportTransaction];
      const bv = b[sortKey as keyof ReportTransaction];
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [from, to, type, category, search, sortKey, sortDir]);

  function applyPreset(id: string) {
    const def = PRESET_DEFS.find((p) => p.id === id);
    if (!def) return;
    const r = def.apply();
    setFrom(r.from);
    setTo(r.to);
    setActivePresetId(id);
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "amount" || key === "date" ? "desc" : "asc");
    }
  }

  const pctChange = (cur: number, prev: number) => {
    if (!prev) return null;
    return Math.round(((cur - prev) / prev) * 1000) / 10;
  };

  const expChange =
    sumCur.data && sumPrev.data && sumPrev.data.expense.total > 0
      ? pctChange(sumCur.data.expense.total, sumPrev.data.expense.total)
      : null;
  const incChange =
    sumCur.data && sumPrev.data && sumPrev.data.income.total > 0
      ? pctChange(sumCur.data.income.total, sumPrev.data.income.total)
      : null;

  const donutData = useMemo(
    () =>
      byCat.slice(0, 10).map((c, i) => ({
        name: categoryLabel(c.category),
        value: c.total,
        category: c.category,
        fill: categoryColor(i),
      })),
    [byCat]
  );

  const copySummary = useCallback(() => {
    const lines = [
      `SpendWise report ${from} → ${to}`,
      `Total expenses: ${formatINR(Math.round(summary.totalExpenses))}`,
      `Total income: ${formatINR(Math.round(summary.totalIncome))}`,
      `Net: ${formatINR(Math.round(summary.netSavings))}`,
      `Savings rate: ${summary.savingsRate}%`,
      `Avg / day: ${formatINR(Math.round(summary.avgPerDay))}`,
      `Top category: ${categoryLabel(summary.topCategory)}`,
    ];
    const text = lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          toast.success("Summary copied to clipboard");
        })
        .catch(() => {
          toast.error("Could not copy summary");
        });
      return;
    }
    toast.error("Clipboard API is not supported in this browser");
  }, [from, to, summary]);

  const handleExportCsv = () => {
    exportTransactionsCsv(sortedRows, from, to);
    toast.success("CSV downloaded");
  };

  const handleServerCsv = async () => {
    try {
      await downloadTransactionsCsv({
        type,
        from,
        to,
        ...(category !== "__all__" ? { category } : {}),
      });
      toast.success("Server export started");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Export failed"));
    }
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const filters: ReportFiltersState = {
      type,
      from,
      to,
      category,
      groupBy,
      compareMode,
    };
    const next: SavedPreset[] = [
      ...presets.filter((p) => p.name !== name),
      { id: crypto.randomUUID(), name, filters, savedAt: new Date().toISOString() },
    ];
    setPresets(next);
    savePresets(next);
    setSaveOpen(false);
    setPresetName("");
    toast.success("Preset saved");
  };

  const restorePreset = (p: SavedPreset) => {
    const f = p.filters;
    setType(f.type);
    setFrom(f.from);
    setTo(f.to);
    setCategory(f.category);
    setGroupBy(f.groupBy);
    setCompareMode(f.compareMode);
    setActivePresetId("");
    void qc.invalidateQueries({ queryKey: ["reports-summary"] });
  };

  const loading = txPending || sumCur.isPending;
  const subtleLoad = txFetching && !txPending;

  return (
    <div className="min-w-0 w-full space-y-4 text-white">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("page.reports.title")}</h1>
        <p className="text-xs text-gray-400">{t("page.reports.subtitle")}</p>
      </div>

      {presets.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Saved</span>
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={activePresetId === p.id ? "default" : "secondary"}
                className="rounded-full"
                onClick={() => {
                  restorePreset(p);
                }}
              >
                {p.name}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 text-gray-500 hover:text-red-400"
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  const next = presets.filter((x) => x.id !== p.id);
                  setPresets(next);
                  savePresets(next);
                }}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      ) : null}

        <Card className="time-range-selector border-white/10 bg-[#161b22]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
          <CardDescription className="text-gray-400">Adjust range and grouping; charts refresh automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_DEFS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={activePresetId === p.id ? "default" : "outline"}
                className={cn("rounded-full border-white/15", activePresetId !== p.id && "bg-transparent")}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as ReportFiltersState["type"])}
              >
                <SelectTrigger className="h-8 border-white/10 bg-[#0d1117] px-2.5 text-xs text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rf">From</Label>
              <DatePicker
                id="rf"
                value={from}
                onChange={(v) => {
                  setFrom(v);
                  setActivePresetId("");
                }}
                triggerClassName="h-8 border-white/10 bg-[#0d1117] text-xs"
                align="start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt">To</Label>
              <DatePicker
                id="rt"
                value={to}
                onChange={(v) => {
                  setTo(v);
                  setActivePresetId("");
                }}
                triggerClassName="h-8 border-white/10 bg-[#0d1117] text-xs"
                align="start"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => value && setCategory(value)}>
                <SelectTrigger className="h-8 border-white/10 bg-[#0d1117] px-2.5 text-xs text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group by</Label>
              <div className="report-type-tabs flex rounded-lg border border-white/10 bg-[#0d1117] p-1">
                {(["day", "week", "month"] as const).map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn("flex-1 capitalize", groupBy === g && "bg-white/10 text-white")}
                    onClick={() => setGroupBy(g)}
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <Switch id="cmp" checked={compareMode} onCheckedChange={setCompareMode} />
              <Label htmlFor="cmp" className="text-sm text-gray-300">
                Compare to previous period
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2 border-white/15" onClick={() => setSaveOpen(true)}>
                <Save className="size-4" />
                Save preset
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }), "gap-2 border-white/15")}
                >
                  <Download className="size-4" />
                  Export
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-white/10 bg-[#161b22] text-white">
                  <DropdownMenuItem className="focus:bg-white/10" onClick={handleExportCsv}>
                    <FileDown className="mr-2 size-4" />
                    Export CSV (filtered)
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/10" onClick={handleServerCsv}>
                    <Download className="mr-2 size-4" />
                    Export CSV (server)
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/10" onClick={() => window.print()}>
                    <Printer className="mr-2 size-4" />
                    Print / Save as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-white/10" onClick={copySummary}>
                    <Copy className="mr-2 size-4" />
                    Copy summary
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : sumCur.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {getApiErrorMessage(sumCur.error, "Could not load summary")}
        </p>
      ) : (
        <>
          {subtleLoad ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              Updating…
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Total expenses"
              value={formatINR(Math.round(summary.totalExpenses))}
              sub={expChange != null ? `${expChange >= 0 ? "+" : ""}${expChange}% vs prev` : "—"}
              trend={expChange != null && expChange < 0 ? "good-expense" : expChange != null && expChange > 0 ? "bad-expense" : "neutral"}
            />
            <KpiCard
              title="Total income"
              value={formatINR(Math.round(summary.totalIncome))}
              sub={incChange != null ? `${incChange >= 0 ? "+" : ""}${incChange}% vs prev` : "—"}
              trend={incChange != null && incChange > 0 ? "good-income" : incChange != null && incChange < 0 ? "bad-income" : "neutral"}
            />
            <KpiCard
              title="Net savings"
              value={formatINR(Math.round(summary.netSavings))}
              sub={summary.netSavings >= 0 ? "Positive cashflow" : "Deficit"}
              trend={summary.netSavings >= 0 ? "good-income" : "bad-expense"}
            />
            <Card className="chart-area border-white/10 bg-[#161b22]">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Savings rate</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{summary.savingsRate}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={Math.min(100, Math.max(0, summary.savingsRate))} className="h-2" />
                <p className="text-muted-foreground mt-2 text-xs">Share of income left after expenses</p>
              </CardContent>
            </Card>
            <KpiCard
              title="Avg daily spend"
              value={`${formatINR(Math.round(summary.avgPerDay))}/day`}
              sub={`${getDaysBetween(from, to).length} days in range`}
              trend="neutral"
            />
            <Card className="border-white/10 bg-[#161b22]">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Top category</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="truncate">{categoryLabel(summary.topCategory)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {summary.totalExpenses > 0 && byCat[0]
                  ? `${Math.round((byCat[0].total / summary.totalExpenses) * 100)}% of spend`
                  : "—"}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-white/10 bg-[#161b22]">
              <CardHeader>
                <CardTitle className="text-sm">Income vs expenses</CardTitle>
                <CardDescription className="text-gray-400">Bars = expenses, line = income</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px] min-h-[280px] w-full min-w-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartMerged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={(v) => formatINRShort(Number(v))} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} width={48} />
                    <Tooltip
                      contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(v, name) => [formatINR(Math.round(Number(v ?? 0))), String(name)]}
                    />
                    <Legend />
                    <Bar dataKey="expense" name="Expenses" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#22c55e" dot={false} strokeWidth={2} />
                    {compareMode ? (
                      <Line type="monotone" dataKey="incomePrev" name="Income (prev)" stroke="#9ca3af" strokeDasharray="4 4" dot={false} />
                    ) : null}
                    {compareMode ? (
                      <Line type="monotone" dataKey="expensePrev" name="Expenses (prev)" stroke="#818cf8" strokeDasharray="5 5" dot={false} />
                    ) : null}
                    <Area type="monotone" dataKey="income" fill="#22c55e" fillOpacity={0.08} stroke="none" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Card className="border-white/10 bg-[#161b22]">
                <CardHeader>
                  <CardTitle className="text-sm">By category</CardTitle>
                  <CardDescription className="text-gray-400">Tap a slice to filter</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="h-[220px] w-full min-w-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={80}
                          paddingAngle={2}
                          onClick={(_, index) => {
                            const cat = donutData[index]?.category;
                            if (cat) setCategory(cat);
                          }}
                        >
                          {donutData.map((_, i) => (
                            <Cell key={i} fill={donutData[i].fill} className="cursor-pointer outline-none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatINR(Math.round(Number(v ?? 0)))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm text-gray-400">Total expenses</p>
                  <p className="text-lg font-semibold tabular-nums">{formatINR(Math.round(summary.totalExpenses))}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-[#161b22]">
                <CardHeader>
                  <CardTitle className="text-sm">Category bars</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {byCat.slice(0, 8).map((c, i) => {
                    const pct = summary.totalExpenses > 0 ? (c.total / summary.totalExpenses) * 100 : 0;
                    return (
                      <button
                        key={c.category}
                        type="button"
                        className="w-full text-left"
                        onClick={() => setCategory(c.category)}
                      >
                        <div className="mb-1 flex justify-between text-sm">
                          <span>
                            {categoryLabel(c.category)}
                          </span>
                          <span className="tabular-nums text-gray-400">
                            {formatINR(Math.round(c.total))} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: categoryColor(i) }}
                          />
                        </div>
                      </button>
                    );
                  })}
                  {!byCat.length ? <p className="text-sm text-gray-500">No expense data in this range.</p> : null}
                </CardContent>
              </Card>
            </div>
          </div>

          <HeatmapSection from={from} to={to} expenseByDay={expenseByDay} max={heatmapMax} filtered={filtered} />

          <div className="insights-panel grid gap-3 md:grid-cols-3">
            {insights.map((ins) => (
              <Card key={ins.id} className="border-white/10 bg-[#161b22]">
                <CardContent className="flex gap-3 pt-6">
                  <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Lightbulb className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm leading-relaxed text-gray-200">{ins.text}</p>
                    {ins.actionHref ? (
                      <Link to={ins.actionHref} className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}>
                        {ins.actionLabel}
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-white/10 bg-[#161b22]">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm">Transactions</CardTitle>
                <CardDescription className="text-gray-400">{sortedRows.length} rows in range</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input className="border-white/10 bg-[#0d1117] pl-9" placeholder="Search note or tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!sortedRows.length ? (
                <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center text-sm">
                  <p>No transactions match these filters.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleSort("date")}>
                          Date
                        </TableHead>
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300">Category</TableHead>
                        <TableHead className="text-gray-300">Note</TableHead>
                        <TableHead className="text-right text-gray-300">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((r) => (
                        <Fragment key={r.id}>
                          <TableRow
                            className="border-white/10 cursor-pointer"
                            onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                          >
                            <TableCell className="tabular-nums text-gray-300">{r.date}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  r.type === "income"
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                                    : "border-red-500/40 bg-red-500/15 text-red-200"
                                )}
                              >
                                {r.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {categoryLabel(r.category)}
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate text-gray-300">{r.note}</TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-medium tabular-nums",
                                r.type === "income" ? "text-emerald-400" : "text-red-300"
                              )}
                            >
                              {r.type === "income" ? "+" : "−"}
                              {formatINR(Math.round(r.amount))}
                            </TableCell>
                          </TableRow>
                          {expandedId === r.id ? (
                            <TableRow className="border-white/10 bg-[#0d1117]/50">
                              <TableCell colSpan={5} className="text-sm text-gray-400">
                                {r.note}
                                {r.tags.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {r.tags.map((t) => (
                                      <Badge key={t} variant="secondary" className="text-xs">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-muted-foreground text-xs">
                      Page {page} / {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Previous
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="border-white/10 bg-[#161b22] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save preset</DialogTitle>
            <DialogDescription className="text-gray-400">Store this filter combination for quick reuse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pn">Name</Label>
            <Input id="pn" value={presetName} onChange={(e) => setPresetName(e.target.value)} className="border-white/10 bg-[#0d1117]" placeholder="e.g. Last month expenses" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePreset} disabled={!presetName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  trend,
}: {
  title: string;
  value: string;
  sub: string;
  trend: "good-expense" | "bad-expense" | "good-income" | "bad-income" | "neutral";
}) {
  const Icon =
    trend === "good-expense" || trend === "good-income" ? (
      trend === "good-expense" ? (
        <TrendingDown className="size-4 text-emerald-400" />
      ) : (
        <TrendingUp className="size-4 text-emerald-400" />
      )
    ) : trend === "bad-expense" || trend === "bad-income" ? (
      trend === "bad-expense" ? (
        <ArrowUpRight className="size-4 text-red-400" />
      ) : (
        <ArrowDownRight className="size-4 text-red-400" />
      )
    ) : null;
  return (
    <Card className="border-white/10 bg-[#161b22]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription className="text-gray-400">{title}</CardDescription>
        {Icon}
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
      </CardContent>
    </Card>
  );
}

function HeatmapSection({
  from,
  to,
  expenseByDay,
  max,
  filtered,
}: {
  from: string;
  to: string;
  expenseByDay: Map<string, number>;
  max: number;
  filtered: ReportTransaction[];
}) {
  const days = getDaysBetween(from, to);
  if (!days.length) return null;
  const first = new Date(days[0] + "T12:00:00");
  const offset = (first.getDay() + 6) % 7;
  const cells: { date: string | null; amount: number }[] = [];
  for (let i = 0; i < offset; i++) cells.push({ date: null, amount: 0 });
  for (const d of days) {
    cells.push({ date: d, amount: expenseByDay.get(d) || 0 });
  }
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  const countOnDay = (date: string | null) => {
    if (!date) return 0;
    return filtered.filter((t) => t.date === date).length;
  };
  return (
    <Card className="border-white/10 bg-[#161b22]">
      <CardHeader>
        <CardTitle className="text-sm">Daily spend heatmap</CardTitle>
        <CardDescription className="text-gray-400">Expense intensity by day</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {wk.map((cell, di) => (
                <div
                  key={di}
                  title={
                    cell.date
                      ? `${cell.date}: ${formatINR(Math.round(cell.amount))} · ${countOnDay(cell.date)} tx`
                      : undefined
                  }
                  className={cn(
                    "size-8 rounded-sm sm:size-9",
                    cell.date ? heatmapIntensityClass(cell.amount, max) : "bg-transparent"
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="size-4 rounded-sm border border-white/10" />
            <div className="size-4 rounded-sm bg-indigo-500/20" />
            <div className="size-4 rounded-sm bg-indigo-500/40" />
            <div className="size-4 rounded-sm bg-indigo-500/65" />
            <div className="size-4 rounded-sm bg-indigo-500" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
