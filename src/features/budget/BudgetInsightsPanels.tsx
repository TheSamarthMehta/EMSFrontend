import type { ReactNode } from "react";
import { BarChart2, CheckCircle2, Flame, Lightbulb, Loader2, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getBudgetCategoryMeta } from "@/features/budget/budgetConstants";
import {
  daysInMonth,
  formatINR,
  getCalendarDayOfMonth,
  getSpentPercent,
  isViewingCurrentMonth,
  projectMonthEndTotalSpent,
} from "@/features/budget/budgetUtils";
import { useAiInsights } from "@/hooks/useAi";
import type { AiInsightTone } from "@/types/ai";
import type { BudgetSummaryCategory } from "@/types/budget";
import { cn } from "@/lib/utils";

function maskAmount(hidden: boolean, value: string): string {
  return hidden ? "₹ ••••" : value;
}

const AI_TONE_BADGE: Record<AiInsightTone, string> = {
  positive: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-100",
  warning: "border-amber-500/20 bg-amber-500/[0.07] text-amber-100",
  tip: "border-sky-500/20 bg-sky-500/[0.07] text-sky-100",
  neutral: "border-border bg-muted/30 text-muted-foreground",
};

export function BudgetAIInsightsPanel({
  categories,
  hideAmounts,
}: {
  categories: BudgetSummaryCategory[];
  hideAmounts: boolean;
}) {
  const exceeded = categories.filter((c) => c.status === "over" || getSpentPercent(c) >= 100);
  const near = categories.filter((c) => {
    const p = getSpentPercent(c);
    return p >= 85 && p < 100;
  });
  const under = categories.filter((c) => {
    const p = getSpentPercent(c);
    return p > 0 && p < 30;
  });

  // Real AI summary (model-generated, cached 30 min). Falls back gracefully when AI is off.
  const ai = useAiInsights({ lookbackDays: 90 });

  const line = (icon: ReactNode, title: string, items: BudgetSummaryCategory[]) =>
    items.length ? (
      <div className="space-y-1.5">
        <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          {icon}
          {title}
        </p>
        <ul className="text-foreground/90 space-y-1 text-xs">
          {items.map((c) => {
            const m = getBudgetCategoryMeta(c.category);
            return (
              <li key={c._id} className="bg-muted/50 flex justify-between gap-2 rounded-md px-2 py-1.5">
                <span>
                  {m.label}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {hideAmounts ? "₹ ••••" : formatINR(Math.round(c.spent))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <Card className="border-border bg-card rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground flex items-center gap-1.5 text-sm">
          <Lightbulb className="size-3.5 text-foreground/60" />
          Insights
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          Patterns from this month&apos;s spend plus quick budget checks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* AI-generated section */}
        {ai.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-md bg-white/5" />
            <Skeleton className="h-12 w-full rounded-md bg-white/5" />
          </div>
        ) : !ai.data?.enabled ? (
          <p className="border-border bg-muted/30 text-muted-foreground rounded-md border px-2.5 py-2 text-[11px]">
            Auto-generated summary is disabled on this server.
          </p>
        ) : ai.data.insights && ai.data.insights.length > 0 ? (
          <div className="space-y-2">
            {ai.data.summary ? (
              <p className="border-border bg-muted/30 text-foreground rounded-md border px-2.5 py-2 text-[11px] font-medium">
                {ai.data.summary}
              </p>
            ) : null}
            <ul className="space-y-1">
              {ai.data.insights.slice(0, 3).map((ins, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-[11px]",
                    AI_TONE_BADGE[ins.tone] ?? AI_TONE_BADGE.neutral
                  )}
                >
                  <span className="font-semibold">{ins.title}</span>
                  <span className="text-muted-foreground"> — {ins.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="border-border bg-muted/30 text-muted-foreground rounded-md border px-2.5 py-2 text-[11px]">
            {ai.data.summary ?? "Add expenses across the month to get AI insights."}
          </p>
        )}

        <div className="h-px w-full bg-white/5" />

        {/* Rule-based heuristics */}
        {line(<Flame className="size-3 text-red-400" />, "Over budget", exceeded)}
        {line(<Target className="size-3 text-amber-400" />, "Near limit (85–99%)", near)}
        {line(<BarChart2 className="text-primary size-3" />, "Under-utilized (<30%)", under)}

        {!exceeded.length && !near.length && !under.length ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-100">
            <CheckCircle2 className="mt-0.5 size-3 shrink-0" />
            <span>All categories healthy — no overspend or tight categories detected.</span>
          </div>
        ) : null}

        {ai.isFetching && !ai.isPending ? (
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Refreshing…
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BudgetSpendBreakdownPanel({
  categories,
  hideAmounts,
}: {
  categories: BudgetSummaryCategory[];
  hideAmounts: boolean;
}) {
  const total = categories.reduce((a, c) => a + c.spent, 0);
  const top = [...categories].sort((a, b) => b.spent - a.spent).slice(0, 5);

  return (
    <Card className="border-border bg-card rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-base">
          <BarChart2 className="text-primary size-4" />
          Spend breakdown
        </CardTitle>
        <CardDescription className="text-muted-foreground">Top categories by spend this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!top.length ? (
          <p className="text-muted-foreground text-sm">No budget lines yet.</p>
        ) : (
          top.map((c) => {
            const m = getBudgetCategoryMeta(c.category);
            const pct = total > 0 ? Math.round((c.spent / total) * 1000) / 10 : 0;
            return (
              <div key={c._id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground truncate">
                    {m.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {hideAmounts ? "₹ ••••" : formatINR(Math.round(c.spent))}{" "}
                    <span className="text-muted-foreground/80">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-all", m.colorClass)}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function BudgetMonthProgressPanel({
  year,
  month,
  totalSpent,
  hideAmounts,
}: {
  year: number;
  month: number;
  totalSpent: number;
  hideAmounts: boolean;
}) {
  if (!isViewingCurrentMonth(year, month)) return null;

  const dim = daysInMonth(year, month);
  const dom = getCalendarDayOfMonth();
  const remaining = Math.max(0, dim - dom);
  const dailyAvg = dom > 0 ? totalSpent / dom : 0;
  const progressPct = dim > 0 ? Math.min(100, (dom / dim) * 100) : 0;

  return (
    <Card className="border-border bg-card rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-base">Month progress</CardTitle>
        <CardDescription className="text-muted-foreground">Where you are in the billing month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>
            Day {dom} of {dim}
          </span>
          <span>{remaining} days left</span>
        </div>
        <Progress value={progressPct} className="h-2 bg-white/10" />
        <Separator className="bg-white/10" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily average (total)</span>
          <span className="text-foreground font-medium tabular-nums">
            {maskAmount(hideAmounts, formatINR(Math.round(dailyAvg)))}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Projection uses cumulative spend ÷ days elapsed × days in month (
          {maskAmount(hideAmounts, formatINR(Math.round(projectMonthEndTotalSpent(totalSpent, year, month))))}{" "}
          implied month-end).
        </p>
      </CardContent>
    </Card>
  );
}
