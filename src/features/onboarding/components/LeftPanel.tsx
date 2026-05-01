import { Check } from "lucide-react";

import { DonutChart } from "@/components/complete-profile/DonutChart";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ChecklistRow } from "@/types/onboarding";

interface LeftPanelProps {
  progressPercent: number;
  headline: string;
  checklist: ChecklistRow[];
}

export function LeftPanel({ progressPercent, headline, checklist }: LeftPanelProps) {
  return (
    <aside className="flex flex-col lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/95 p-5 shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{APP_NAME}</p>
        <h1 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
          Complete your profile
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
          Intelligent setup — we&apos;ll tailor suggestions as you go.
        </p>

        <div className="mt-5 flex flex-col items-center">
          <DonutChart percent={progressPercent} />
          <p className="mt-3 text-center text-xs font-medium leading-relaxed text-slate-300">{headline}</p>
        </div>

        <ul className="mt-5 space-y-1.5">
          {checklist.map((row) => (
            <li
              key={row.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs leading-snug transition-colors",
                row.status === "done" && "border-emerald-500/25 bg-emerald-500/5 text-emerald-100",
                row.status === "active" &&
                  "border-[hsl(252_87%_67%)]/40 bg-[hsl(252_87%_67%)]/10 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.12)]",
                row.status === "pending" && "border-white/[0.06] bg-white/[0.02] text-slate-500"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  row.status === "done" && "bg-emerald-500/20 text-emerald-300",
                  row.status === "active" && "bg-[hsl(252_87%_67%)]/25 text-indigo-200",
                  row.status === "pending" && "bg-white/5 text-slate-500"
                )}
              >
                {row.status === "done" ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : row.status === "active" ? (
                  <span className="text-[12px] leading-none text-indigo-300">●</span>
                ) : (
                  <span className="text-[12px] leading-none text-slate-600">○</span>
                )}
              </span>
              <span className="font-medium">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
