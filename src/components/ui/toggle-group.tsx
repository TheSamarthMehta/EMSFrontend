"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";

function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex flex-wrap items-center justify-start gap-2", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)] px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(252_87%_67%)]/50 data-[state=on]:border-[hsl(280_80%_65%)]/40 data-[state=on]:bg-[hsl(280_80%_65%)]/10 data-[state=on]:text-white",
        className
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
