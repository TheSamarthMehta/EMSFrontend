import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getBudgetCategoryMeta } from "@/features/budget/budgetConstants";
import { formatINR, getCategoryForecast, isViewingCurrentMonth } from "@/features/budget/budgetUtils";
import type { BudgetSummaryCategory } from "@/types/budget";
import { cn } from "@/lib/utils";

export function BudgetForecastBadge({
  line,
  year,
  month,
}: {
  line: BudgetSummaryCategory;
  year: number;
  month: number;
}) {
  if (!isViewingCurrentMonth(year, month)) return null;

  const { label, tooltip, overBy, projected, effectiveLimit } = getCategoryForecast(line, year, month);

  const badgeClass =
    label === "over"
      ? "border-red-500/40 bg-red-500/15 text-red-300"
      : label === "near-limit"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";

  const text =
    label === "over"
      ? `${formatINR(Math.max(0, Math.round(overBy)))} over`
      : label === "near-limit"
        ? "Near limit"
        : "On track";

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="inline-flex cursor-default rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={`Forecast for ${getBudgetCategoryMeta(line.category).label}: ${text}`}
      >
        <Badge variant="outline" className={cn("pointer-events-none gap-1 border font-medium tabular-nums", badgeClass)}>
          {label === "over" ? (
            <TrendingDown className="size-3.5 shrink-0" />
          ) : label === "near-limit" ? (
            <TrendingUp className="size-3.5 shrink-0 opacity-80" />
          ) : (
            <TrendingUp className="size-3.5 shrink-0" />
          )}
          {text}
          <Info className="size-3.5 opacity-70" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="border-border bg-popover text-popover-foreground max-w-xs border">
        <p className="text-xs leading-relaxed">{tooltip}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          Projected ~{formatINR(Math.round(projected))} vs cap {formatINR(Math.round(effectiveLimit))}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
