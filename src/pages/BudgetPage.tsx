import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { deleteBudget, getBudgets, getBudgetSummary, patchBudget, postBudget } from "@/api/budget";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BudgetForecastBadge } from "@/features/budget/BudgetForecastBadge";
import {
  BudgetAIInsightsPanel,
  BudgetMonthProgressPanel,
  BudgetSpendBreakdownPanel,
} from "@/features/budget/BudgetInsightsPanels";
import { ALERT_THRESHOLDS, BUDGET_CATEGORY_CONFIG, getBudgetCategoryMeta } from "@/features/budget/budgetConstants";
import {
  exportBudgetCsv,
  formatINR,
  getCalendarDayOfMonth,
  getProgressColorClass,
  getSpentPercent,
  isViewingCurrentMonth,
  projectMonthEndTotalSpent,
} from "@/features/budget/budgetUtils";
import { useBudgets, useBudgetSummary } from "@/hooks/useBudgetData";
import { cn } from "@/lib/utils";
import type { AlertThreshold, BudgetRow } from "@/types/budget";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";
import { useI18n } from "@/context/LanguageContext";

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function addCalendarMonth(y: number, m: number, delta: number) {
  const d = new Date(y, m - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function maskInr(hidden: boolean, value: string): string {
  return hidden ? "₹ ••••" : value;
}

function alertThresholdOrDefault(v: unknown): AlertThreshold {
  const n = Number(v);
  return ALERT_THRESHOLDS.includes(n as AlertThreshold) ? (n as AlertThreshold) : 90;
}

export default function BudgetPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [mainTab, setMainTab] = useState<"categories" | "alerts" | "table">("categories");

  const { data: summary, isPending: sPending, isError: sErr, error: sError } = useBudgetSummary(year, month);
  const { data: budgetRows, isPending: bPending } = useBudgets(year, month);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<BudgetRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<BudgetRow | null>(null);

  const [formCat, setFormCat] = useState<string>(BUDGET_CATEGORY_CONFIG[0].id);
  const [formLimit, setFormLimit] = useState("");
  const [formSpentManual, setFormSpentManual] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formAlert, setFormAlert] = useState(false);
  const [formThreshold, setFormThreshold] = useState<AlertThreshold>(90);
  const [formRollover, setFormRollover] = useState(false);
  const [formRolloverAmt, setFormRolloverAmt] = useState("");

  const usedCategoryIds = new Set((budgetRows ?? []).map((r) => r.category));
  const availableToAdd = BUDGET_CATEGORY_CONFIG.filter((c) => !usedCategoryIds.has(c.id));

  const createMut = useMutation({
    mutationFn: () =>
      postBudget({
        category: formCat,
        year,
        month,
        limit: Number.parseFloat(formLimit),
        note: formNote.trim() || undefined,
        manualSpentOverride: (() => {
          const t = formSpentManual.trim();
          if (t === "") return null;
          const n = Number.parseFloat(t);
          return Number.isFinite(n) ? Math.max(0, n) : null;
        })(),
        alertEnabled: formAlert,
        alertThreshold: formThreshold,
        rolloverEnabled: formRollover,
        rolloverAmount: formRollover ? Math.max(0, Number.parseFloat(formRolloverAmt) || 0) : 0,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["budgets", year, month] });
      await qc.invalidateQueries({ queryKey: ["budget-summary", year, month] });
      toast.success("Budget created");
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not save"));
    },
  });

  const patchMut = useMutation({
    mutationFn: () =>
      patchBudget(editRow!._id, {
        limit: Number.parseFloat(formLimit),
        note: formNote.trim(),
        manualSpentOverride: (() => {
          const t = formSpentManual.trim();
          if (t === "") return null;
          const n = Number.parseFloat(t);
          return Number.isFinite(n) ? Math.max(0, n) : null;
        })(),
        alertEnabled: formAlert,
        alertThreshold: formThreshold,
        rolloverEnabled: formRollover,
        rolloverAmount: Math.max(0, Number.parseFloat(formRolloverAmt) || 0),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["budgets", year, month] });
      await qc.invalidateQueries({ queryKey: ["budget-summary", year, month] });
      toast.success("Budget updated");
      setEditRow(null);
      resetForm();
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not update"));
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["budgets", year, month] });
      await qc.invalidateQueries({ queryKey: ["budget-summary", year, month] });
      toast.success("Budget removed");
      setDeleteRow(null);
    },
    onError: (e: unknown) => {
      toast.error(getApiErrorMessage(e, "Could not delete"));
    },
  });

  const copyMut = useMutation({
    mutationFn: async () => {
      const prev = addCalendarMonth(year, month, -1);
      const [{ budgets: prevRows }, prevSummary] = await Promise.all([
        getBudgets(prev.year, prev.month),
        getBudgetSummary(prev.year, prev.month),
      ]);
      if (!prevRows.length) {
        throw new Error("NO_PREV");
      }
      const cur = qc.getQueryData<BudgetRow[]>(["budgets", year, month]) ?? [];
      const prevCatRows = new Map(prevSummary.categories.map((c) => [c.category, c]));

      for (const b of prevRows) {
        const prevLine = prevCatRows.get(b.category);
        const spentPrev = prevLine?.spent ?? 0;
        const effectivePrev = b.limit + (Number(b.rolloverAmount) || 0);
        const nextRollover = b.rolloverEnabled ? Math.max(0, effectivePrev - spentPrev) : 0;
        const payload = {
          limit: b.limit,
          note: b.note ?? "",
          manualSpentOverride: null as number | null,
          alertEnabled: Boolean(b.alertEnabled),
          alertThreshold: alertThresholdOrDefault(b.alertThreshold),
          rolloverEnabled: Boolean(b.rolloverEnabled),
          rolloverAmount: nextRollover,
        };
        const existing = cur.find((x) => x.category === b.category);
        if (existing) {
          await patchBudget(existing._id, payload);
        } else {
          await postBudget({
            category: b.category,
            year,
            month,
            ...payload,
          });
        }
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["budgets", year, month] });
      await qc.invalidateQueries({ queryKey: ["budget-summary", year, month] });
      toast.success("Copied last month’s budget with rollover applied");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error && e.message === "NO_PREV" ? "No budget data in the previous month" : getApiErrorMessage(e, "Copy failed");
      toast.error(msg);
    },
  });

  function resetForm() {
    setFormCat(availableToAdd[0]?.id ?? BUDGET_CATEGORY_CONFIG[0].id);
    setFormLimit("");
    setFormSpentManual("");
    setFormNote("");
    setFormAlert(false);
    setFormThreshold(90);
    setFormRollover(false);
    setFormRolloverAmt("");
  }

  function openCreate() {
    resetForm();
    const first = availableToAdd[0]?.id ?? BUDGET_CATEGORY_CONFIG[0].id;
    setFormCat(first);
    const def = getBudgetCategoryMeta(first).defaultLimitInr;
    setFormLimit(String(def));
    setCreateOpen(true);
  }

  function openEdit(row: BudgetRow) {
    setEditRow(row);
    setFormLimit(String(row.limit));
    setFormNote(row.note || "");
    setFormSpentManual(row.manualSpentOverride != null ? String(row.manualSpentOverride) : "");
    setFormAlert(Boolean(row.alertEnabled));
    setFormThreshold(alertThresholdOrDefault(row.alertThreshold));
    setFormRollover(Boolean(row.rolloverEnabled));
    setFormRolloverAmt(String(row.rolloverAmount ?? 0));
  }

  function shiftMonth(delta: number) {
    const d = addCalendarMonth(year, month, delta);
    setYear(d.year);
    setMonth(d.month);
  }

  const categories = summary?.categories ?? [];
  const totals = summary?.totals;

  const anyOver = categories.some((c) => c.status === "over" || c.spent > (c.limit + (c.rolloverAmount ?? 0)));
  const totalSpent = totals?.totalSpentOnBudgetedCategories ?? 0;
  const totalLimit = totals?.totalLimit ?? 0;
  const totalEffective = totals?.totalEffectiveLimit ?? totalLimit;
  const projectedEnd = projectMonthEndTotalSpent(totalSpent, year, month);
  const projectedOver = isViewingCurrentMonth(year, month) && projectedEnd > totalEffective;

  const activeAlerts = categories.filter((c) => {
    if (!c.alertEnabled) return false;
    const th = alertThresholdOrDefault(c.alertThreshold);
    return getSpentPercent(c) >= th;
  });

  const alertTabCount = activeAlerts.length;

  const dailyAvg = isViewingCurrentMonth(year, month)
    ? getCalendarDayOfMonth() > 0
      ? totalSpent / getCalendarDayOfMonth()
      : 0
    : 0;
  const dim = new Date(year, month, 0).getDate();
  const projectedFromDaily = isViewingCurrentMonth(year, month) ? dailyAvg * dim : totalSpent;

  function exportCsv() {
    const csv = exportBudgetCsv(categories);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  }

  const canSubmitForm =
    Boolean(formLimit) && Number.parseFloat(formLimit) > 0 && !createMut.isPending && !patchMut.isPending;

  if (sPending || bPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (sErr || !summary || !totals) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {getApiErrorMessage(sError, "Could not load budgets")}
      </p>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <div className="text-foreground flex min-w-0 flex-col gap-4">
        <header className="border-border bg-background/95 sticky top-0 z-20 w-full border-b py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("page.budget.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("page.budget.subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" className="border-border" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums">{monthLabel(year, month)}</span>
              <Button variant="outline" size="icon" className="border-border" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="border-border" onClick={() => setHideAmounts((v) => !v)} aria-label={hideAmounts ? "Show amounts" : "Hide amounts"}>
                {hideAmounts ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
              <Button variant="outline" className="border-border gap-2" onClick={exportCsv}>
                <Download className="size-4" />
                Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  aria-label="More actions"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon" }),
                    "border-border"
                  )}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-border bg-popover text-popover-foreground">
                  <DropdownMenuItem
                    className="focus:bg-white/10"
                    disabled={copyMut.isPending}
                    onClick={() => copyMut.mutate()}
                  >
                    <Copy className="mr-2 size-4" />
                    Copy last month&apos;s budget
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button id="add-category-btn" className="gap-2" onClick={openCreate} disabled={!availableToAdd.length}>
                <PlusCircle className="size-4" />
                Add budget
              </Button>
            </div>
          </div>
        </header>

        <div className="grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col rounded-xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase text-muted-foreground">Budget lines</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{totals.budgetedCategories}</CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xs text-muted-foreground">Categories with a limit this month</CardContent>
          </Card>
          <Card className="flex flex-col rounded-xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase text-muted-foreground">Total limit</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(totalLimit)))}</CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xs text-muted-foreground">Sum of base limits (excludes rollover add-on)</CardContent>
          </Card>
          <Card className="flex flex-col rounded-xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase text-muted-foreground">Spent (budgeted)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(totalSpent)))}</CardTitle>
            </CardHeader>
            <CardContent className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Against effective cap {maskInr(hideAmounts, formatINR(Math.round(totalEffective)))}</span>
              {anyOver ? (
                <Badge variant="destructive" className="text-[10px]">
                  Over limit
                </Badge>
              ) : null}
            </CardContent>
          </Card>
          <Card className="flex flex-col rounded-xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase text-muted-foreground">Projected month-end</CardDescription>
              <CardTitle className={cn("text-2xl tabular-nums", projectedOver && "text-red-400")}>
                {maskInr(hideAmounts, formatINR(Math.round(projectedFromDaily)))}
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xs text-muted-foreground">
              {isViewingCurrentMonth(year, month) ? `Daily avg × ${dim} days` : "Shown as actual spend for past months"}
            </CardContent>
          </Card>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="w-full min-w-0 gap-0 space-y-0">
          <TabsList className="mb-4 h-auto w-full min-w-0 flex-wrap justify-stretch gap-1 rounded-none border-0 border-b border-border bg-background p-0 sm:flex-nowrap">
            <TabsTrigger
              value="categories"
              className="min-h-9 flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2 text-xs text-muted-foreground data-active:border-primary data-active:bg-white/[0.06] data-active:text-foreground hover:bg-white/5 hover:text-foreground sm:flex-initial sm:px-4"
            >
              By category
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="min-h-9 flex-1 gap-1.5 rounded-none border-0 border-b-2 border-transparent px-3 py-2 text-xs text-muted-foreground data-active:border-primary data-active:bg-white/[0.06] data-active:text-foreground hover:bg-white/5 hover:text-foreground sm:flex-initial sm:px-4"
            >
              Alerts
              {alertTabCount > 0 ? (
                <Badge variant="secondary" className="bg-red-500/20 px-1.5 py-0 text-[10px] text-red-200">
                  {alertTabCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="min-h-9 flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2 text-xs text-muted-foreground data-active:border-primary data-active:bg-white/[0.06] data-active:text-foreground hover:bg-white/5 hover:text-foreground sm:flex-initial sm:px-4"
            >
              Budget lines
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-0 w-full min-w-0 space-y-4 focus-visible:ring-0">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
              <div className="category-list min-w-0 space-y-4 lg:col-span-8">
                {!categories.length ? (
                  <Card className="rounded-xl border border-dashed border-white/15 bg-card">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No budgets for this month. Add a category limit to see progress.
                    </CardContent>
                  </Card>
                ) : (
                  categories.map((c) => {
                    const meta = getBudgetCategoryMeta(c.category);
                    const rollover = c.rolloverAmount ?? 0;
                    const effective = c.limit + rollover;
                    const pct = effective > 0 ? (c.spent / effective) * 100 : 0;
                    const barPct = Math.min(100, pct);
                    const rolloverMarkerPct = effective > 0 && rollover > 0 ? (c.limit / effective) * 100 : null;
                    const pctDisplay = Math.round(pct * 10) / 10;

                    return (
                      <Card key={c._id} className="overflow-hidden rounded-xl border-border bg-card">
                        <div className="flex">
                          <div className={cn("w-1.5 shrink-0", meta.colorClass)} aria-hidden />
                          <div className="min-w-0 flex-1">
                            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
                              <div className="space-y-1">
                                <CardTitle className="text-foreground flex flex-wrap items-center gap-1.5 text-sm">
                                  {meta.label}
                                  {c.note ? <span className="text-xs font-normal text-muted-foreground">· {c.note}</span> : null}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-2">
                                  <BudgetForecastBadge line={c} year={year} month={month} />
                                  {c.alertEnabled ? (
                                    <Bell className="size-4 text-amber-400" aria-label="Alerts on" />
                                  ) : (
                                    <BellOff className="size-4 text-muted-foreground" aria-label="Alerts off" />
                                  )}
                                  {c.rolloverEnabled ? (
                                    <span className="flex items-center gap-1 text-xs text-primary" title="Rollover enabled">
                                      <RefreshCcw className="size-3.5" />
                                      Rollover
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  type="button"
                                  aria-label="Open menu"
                                  className={cn(
                                    buttonVariants({ variant: "ghost", size: "icon" }),
                                    "shrink-0 text-muted-foreground"
                                  )}
                                >
                                  <MoreHorizontal className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-border bg-popover text-popover-foreground">
                                  <DropdownMenuItem
                                    className="focus:bg-white/10"
                                    onClick={() => {
                                      const r = budgetRows?.find((b) => b._id === c._id);
                                      if (r) openEdit(r);
                                    }}
                                  >
                                    <Pencil className="mr-2 size-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem
                                    className="text-red-400 focus:bg-red-500/10"
                                    onClick={() => setDeleteRow(budgetRows?.find((b) => b._id === c._id) ?? null)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                              <div className="category-budget-bar relative h-3 w-full overflow-hidden rounded-full bg-white/10">
                                {rolloverMarkerPct != null ? (
                                  <div
                                    className="absolute bottom-0 top-0 z-10 w-px bg-white/70"
                                    style={{ left: `${rolloverMarkerPct}%` }}
                                    title="Base limit / rollover split"
                                  />
                                ) : null}
                                <div
                                  className={cn("h-full rounded-full transition-all", getProgressColorClass(pctDisplay))}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span>
                                  Spent{" "}
                                  <span className="text-foreground font-medium tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(c.spent)))}</span>
                                </span>
                                <span>
                                  Cap{" "}
                                  <span className="text-foreground font-medium tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(effective)))}</span>
                                </span>
                                <span>
                                  Left{" "}
                                  <span className="text-foreground font-medium tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(c.remaining)))}</span>
                                </span>
                                <span className="tabular-nums">{pctDisplay}% used</span>
                              </div>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
              <aside className="min-w-0 space-y-4 lg:sticky lg:top-[4.5rem] lg:col-span-4 lg:self-start">
                <BudgetAIInsightsPanel categories={categories} hideAmounts={hideAmounts} />
                <BudgetSpendBreakdownPanel categories={categories} hideAmounts={hideAmounts} />
                <BudgetMonthProgressPanel year={year} month={month} totalSpent={totalSpent} hideAmounts={hideAmounts} />
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-0 w-full min-w-0 space-y-3 focus-visible:ring-0">
            {!activeAlerts.length ? (
              <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-50">
                <CheckCircle2 className="size-4" />
                <AlertTitle>All clear</AlertTitle>
                <AlertDescription>No categories crossed your alert thresholds.</AlertDescription>
              </Alert>
            ) : (
              activeAlerts.map((c) => {
                const meta = getBudgetCategoryMeta(c.category);
                const pct = getSpentPercent(c);
                const severe = pct >= 100;
                return (
                  <Alert
                    key={c._id}
                    className={cn(
                      "border",
                      severe ? "border-red-500/50 bg-red-500/10 text-red-50" : "border-amber-500/50 bg-amber-500/10 text-amber-50"
                    )}
                  >
                    <AlertTriangle className="size-4" />
                    <AlertTitle>
                      {meta.label}
                    </AlertTitle>
                    <AlertDescription className="flex flex-wrap items-center gap-2">
                      <span>
                        {Math.round(pct)}% of effective limit — threshold {alertThresholdOrDefault(c.alertThreshold)}%
                      </span>
                      <Badge variant="outline" className="border-white/20 text-[10px]">
                        {severe ? "At or over limit" : "Watch"}
                      </Badge>
                    </AlertDescription>
                  </Alert>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-0 w-full min-w-0 space-y-3 focus-visible:ring-0">
            <div className="space-y-3 md:hidden">
              {categories.length === 0 ? (
                <Card className="rounded-xl border-border bg-card">
                  <CardContent className="py-6 text-sm text-muted-foreground">No rows for this month</CardContent>
                </Card>
              ) : (
                categories.map((c) => {
                  const meta = getBudgetCategoryMeta(c.category);
                  const eff = c.limit + (c.rolloverAmount ?? 0);
                  const pct = eff > 0 ? Math.round((c.spent / eff) * 1000) / 10 : 0;
                  return (
                    <Card key={c._id} className="rounded-xl border-border bg-card">
                      <CardContent className="space-y-2 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-foreground font-medium">{meta.label}</p>
                          <span className="tabular-nums text-muted-foreground">{pct}%</span>
                        </div>
                        <p className="text-muted-foreground">Limit: {maskInr(hideAmounts, formatINR(Math.round(c.limit)))}</p>
                        <p className="text-muted-foreground">Spent: {maskInr(hideAmounts, formatINR(Math.round(c.spent)))}</p>
                        <p className="text-muted-foreground">Remaining: {maskInr(hideAmounts, formatINR(Math.round(c.remaining)))}</p>
                        <p className="truncate text-muted-foreground">{c.note || "No note"}</p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            <Card className="rounded-xl border-border bg-card">
              <CardContent className="hidden overflow-x-auto p-0 pt-4 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-right text-muted-foreground">Limit</TableHead>
                      <TableHead className="text-right text-muted-foreground">Spent</TableHead>
                      <TableHead className="text-right text-muted-foreground">Remaining</TableHead>
                      <TableHead className="text-right text-muted-foreground">% Used</TableHead>
                      <TableHead className="text-muted-foreground">Note</TableHead>
                      <TableHead className="text-muted-foreground">Alert</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!categories.length ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No rows for this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((c) => {
                        const meta = getBudgetCategoryMeta(c.category);
                        const eff = c.limit + (c.rolloverAmount ?? 0);
                        const pct = eff > 0 ? Math.round((c.spent / eff) * 1000) / 10 : 0;
                        const row = budgetRows?.find((b) => b._id === c._id);
                        return (
                          <TableRow key={c._id} className="border-border">
                            <TableCell className="text-foreground font-medium">
                              {meta.label}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(c.limit)))}</TableCell>
                            <TableCell className="text-right tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(c.spent)))}</TableCell>
                            <TableCell className="text-right tabular-nums">{maskInr(hideAmounts, formatINR(Math.round(c.remaining)))}</TableCell>
                            <TableCell className="text-right tabular-nums">{pct}%</TableCell>
                            <TableCell className="max-w-[180px] truncate text-muted-foreground">{c.note || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {c.alertEnabled ? `${alertThresholdOrDefault(c.alertThreshold)}%` : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => row && openEdit(row)}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="text-red-400" aria-label="Delete" onClick={() => row && setDeleteRow(row)}>
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogContent className="border-border bg-card text-card-foreground max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add budget</DialogTitle>
              <DialogDescription className="text-muted-foreground">Set limits, optional manual spend, alerts, and rollover.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formCat}
                  onValueChange={(v) => {
                    if (!v) return;
                    setFormCat(v);
                    const def = getBudgetCategoryMeta(v).defaultLimitInr;
                    setFormLimit(String(def));
                  }}
                >
                  <SelectTrigger className="border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    {availableToAdd.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blim">Monthly limit (INR)</Label>
                <NumberInput id="blim" min={0} step={1} value={formLimit} onValueChange={setFormLimit} className="border-border bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bspent">Amount spent so far (optional)</Label>
                <NumberInput
                  id="bspent"
                  min={0}
                  step={1}
                  placeholder="Leave blank to use expenses"
                  value={formSpentManual}
                  onValueChange={setFormSpentManual}
                  className="border-border bg-background"
                />
                <p className="flex items-start gap-1 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  When set, this overrides personal expense totals for the month.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bnote">Note</Label>
                <Textarea id="bnote" rows={2} value={formNote} onChange={(e) => setFormNote(e.target.value)} className="border-border bg-background" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/80 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Overspend alerts</p>
                  <p className="text-xs text-muted-foreground">Notify when usage crosses a threshold.</p>
                </div>
                <Switch checked={formAlert} onCheckedChange={setFormAlert} />
              </div>
              {formAlert ? (
                <div className="space-y-2">
                  <Label>Threshold</Label>
                  <Select value={String(formThreshold)} onValueChange={(v) => v && setFormThreshold(Number(v) as AlertThreshold)}>
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      {ALERT_THRESHOLDS.map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          {t}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/80 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Rollover unused</p>
                  <p className="text-xs text-muted-foreground">Carry unused base limit into next month.</p>
                </div>
                <Switch checked={formRollover} onCheckedChange={setFormRollover} />
              </div>
              {formRollover ? (
                <div className="space-y-2">
                  <Label htmlFor="br">Rollover amount (INR)</Label>
                  <NumberInput id="br" min={0} step={1} value={formRolloverAmt} onValueChange={setFormRolloverAmt} className="border-border bg-background" />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/15" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!canSubmitForm} onClick={() => createMut.mutate()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!editRow}
          onOpenChange={(o) => {
            if (!o) {
              setEditRow(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="border-border bg-card text-card-foreground max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit budget</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editRow ? getBudgetCategoryMeta(editRow.category).label : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="el">Monthly limit (INR)</Label>
                <NumberInput id="el" min={0} step={1} value={formLimit} onValueChange={setFormLimit} className="border-border bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="es">Amount spent so far (optional)</Label>
                <NumberInput
                  id="es"
                  min={0}
                  step={1}
                  placeholder="Leave blank to use expenses"
                  value={formSpentManual}
                  onValueChange={setFormSpentManual}
                  className="border-border bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="en">Note</Label>
                <Textarea id="en" rows={2} value={formNote} onChange={(e) => setFormNote(e.target.value)} className="border-border bg-background" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/80 px-3 py-2">
                <p className="text-sm font-medium">Overspend alerts</p>
                <Switch checked={formAlert} onCheckedChange={setFormAlert} />
              </div>
              {formAlert ? (
                <div className="space-y-2">
                  <Label>Threshold</Label>
                  <Select value={String(formThreshold)} onValueChange={(v) => v && setFormThreshold(Number(v) as AlertThreshold)}>
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      {ALERT_THRESHOLDS.map((t) => (
                        <SelectItem key={t} value={String(t)}>
                          {t}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/80 px-3 py-2">
                <p className="text-sm font-medium">Rollover unused</p>
                <Switch checked={formRollover} onCheckedChange={setFormRollover} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="era">Rollover amount (INR)</Label>
                <NumberInput id="era" min={0} step={1} value={formRolloverAmt} onValueChange={setFormRolloverAmt} className="border-border bg-background" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/15" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button disabled={!canSubmitForm || !editRow} onClick={() => patchMut.mutate()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
          <AlertDialogContent className="border-border bg-card text-card-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete budget?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Remove the limit for &quot;{deleteRow ? getBudgetCategoryMeta(deleteRow.category).label : ""}&quot; in {monthLabel(year, month)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/15 bg-transparent">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => deleteRow && delMut.mutate(deleteRow._id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
