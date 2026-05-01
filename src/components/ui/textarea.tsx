import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaVariant = "default" | "onDark"

function Textarea({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"textarea"> & { variant?: TextareaVariant }) {
  const surface = variant === "onDark" ? "field-control-textarea-on-dark" : "field-control-textarea"
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        surface,
        "resize-y dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
export type { TextareaVariant }
