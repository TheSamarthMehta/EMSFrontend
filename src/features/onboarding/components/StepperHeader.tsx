import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const STEP_COUNT = 3;

interface StepperHeaderProps {
  step: 0 | 1 | 2;
}

export function StepperHeader({ step }: StepperHeaderProps) {
  const pct = ((step + 1) / STEP_COUNT) * 100;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                i < step
                  ? "bg-emerald-500 text-white"
                  : i === step
                    ? "bg-[hsl(252_87%_67%)] text-white"
                    : "bg-white/10 text-slate-500"
              )}
            >
              {i < step ? <Check className="h-3 w-3" strokeWidth={2.5} /> : i + 1}
            </div>
            {i < STEP_COUNT - 1 ? (
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/20 to-white/10" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        <span className={step === 0 ? "text-indigo-300" : ""}>Personal</span>
        <span className={step === 1 ? "text-indigo-300" : ""}>Preferences</span>
        <span className={step === 2 ? "text-indigo-300" : ""}>Finance</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-[hsl(252_87%_67%)]"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
