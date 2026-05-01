import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiInsights } from "@/hooks/useAi";
import type { AiInsightItem, AiInsightTone } from "@/types/ai";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<
  AiInsightTone,
  { icon: typeof Info; iconClass: string; ringClass: string }
> = {
  positive: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    ringClass: "border-emerald-500/20 bg-emerald-500/5",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-400",
    ringClass: "border-amber-500/20 bg-amber-500/5",
  },
  tip: {
    icon: Lightbulb,
    iconClass: "text-sky-400",
    ringClass: "border-sky-500/20 bg-sky-500/5",
  },
  neutral: {
    icon: Info,
    iconClass: "text-muted-foreground",
    ringClass: "border-border bg-card/50",
  },
};

export function SmartInsightsCard() {
  const { data, isPending, isError } = useAiInsights({ lookbackDays: 90 });

  return (
    <Card className="rounded-[var(--radius-card)] border border-border bg-card p-2.5 shadow-[var(--soft-shadow)] sm:p-3">
      <CardHeader className="px-0 pb-2 pt-0">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
          <Lightbulb className="size-3.5 text-foreground/60" />
          Insights
        </CardTitle>
        <CardDescription className="text-[10px]">
          Patterns from your last 90 days of activity.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 px-0 pb-0 pt-0">
        {isPending ? <InsightsSkeleton /> : null}

        {!isPending && isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
            Couldn&apos;t generate insights right now. Try again later.
          </p>
        ) : null}

        {!isPending && !isError && data ? <InsightsBody data={data} /> : null}
      </CardContent>
    </Card>
  );
}

function InsightsBody({ data }: { data: NonNullable<ReturnType<typeof useAiInsights>["data"]> }) {
  if (!data.enabled) {
    return (
      <p className="rounded-md border border-border bg-card/50 px-2.5 py-2 text-[11px] text-muted-foreground">
        Auto-generated insights are disabled on this server.
      </p>
    );
  }

  if (!data.insights || data.insights.length === 0) {
    return (
      <p className="rounded-md border border-border bg-card/50 px-2.5 py-2 text-[11px] text-muted-foreground">
        {data.summary ?? "Add a few expenses and check back — I'll spot patterns once you have data."}
      </p>
    );
  }

  return (
    <>
      {data.summary ? (
        <p className="rounded-md border border-border bg-foreground/[0.04] px-2.5 py-2 text-[11px] font-medium text-foreground">
          {data.summary}
        </p>
      ) : null}
      <ul className="space-y-1.5">
        {data.insights.map((insight, i) => (
          <InsightRow key={i} item={insight} />
        ))}
      </ul>
    </>
  );
}

function InsightRow({ item }: { item: AiInsightItem }) {
  const tone = TONE_STYLES[item.tone] ?? TONE_STYLES.neutral;
  const Icon = tone.icon;
  return (
    <li className={cn("flex gap-2 rounded-md border px-2.5 py-1.5", tone.ringClass)}>
      <Icon className={cn("mt-0.5 size-3 shrink-0", tone.iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-foreground">{item.title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
      </div>
    </li>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-full rounded-md bg-white/5" />
      <Skeleton className="h-9 w-full rounded-md bg-white/5" />
      <Skeleton className="h-9 w-full rounded-md bg-white/5" />
      <Skeleton className="h-9 w-full rounded-md bg-white/5" />
    </div>
  );
}
