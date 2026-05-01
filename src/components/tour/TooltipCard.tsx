import { cn } from "@/lib/utils";

export function TooltipCard({
  title,
  body,
  stepText,
  className,
  children,
}: {
  title: string;
  body: string;
  stepText: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "z-[9999] w-max max-w-[min(320px,calc(100vw-24px))] break-words rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl transition-all duration-200 ease-in-out [overflow-wrap:anywhere]",
        className
      )}
      role="dialog"
      aria-modal="false"
    >
      <p className="text-xs text-slate-500">{stepText}</p>
      <h4 className="mt-1 text-sm font-semibold">{title}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{body}</p>
      <div className="mt-3 flex items-center justify-between gap-2">{children}</div>
    </div>
  );
}

