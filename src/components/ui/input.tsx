import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

type InputVariant = "default" | "onDark"

function Input({
  className,
  type,
  variant = "default",
  ...props
}: Omit<React.ComponentProps<typeof InputPrimitive>, "size"> & {
  variant?: InputVariant
}) {
  const surface = variant === "onDark" ? "field-control-on-dark" : "field-control"
  const dateControl = type === "date" ? "field-control-date" : ""
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        surface,
        dateControl,
        "dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
export type { InputVariant }
