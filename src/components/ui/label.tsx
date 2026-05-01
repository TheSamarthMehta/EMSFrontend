import * as React from "react"

import { cn } from "@/lib/utils"

type LabelVariant = "default" | "onDark"

function Label({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"label"> & { variant?: LabelVariant }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "field-label flex items-center gap-2 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        variant === "onDark" && "text-indigo-100/85",
        className
      )}
      {...props}
    />
  )
}

export { Label }
export type { LabelVariant }
