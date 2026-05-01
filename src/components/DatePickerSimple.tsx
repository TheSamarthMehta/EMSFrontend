"use client"

import { useState } from "react"
import { format } from "date-fns"

import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DatePickerSimpleProps = {
  id?: string
  label?: string
  className?: string
  placeholder?: string
  /** Inclusive lower bound for year dropdown / navigation (default 1940). */
  fromYear?: number
  /** Inclusive upper year (default: current calendar year). */
  toYear?: number
}

/**
 * Minimal date-of-birth style picker: `Popover` + `Calendar` with dropdown month/year.
 *
 * Differs from typical Radix/shadcn snippets: this app uses **Base UI** `PopoverTrigger`,
 * which always renders a native `<button>` — there is no `asChild`; apply `buttonVariants`
 * on the trigger via `className` instead of nesting `<Button>` inside `<PopoverTrigger>`.
 */
export function DatePickerSimple({
  id = "date-picker-simple",
  label = "Date of birth",
  className,
  placeholder = "Select date",
  fromYear = 1940,
  toYear = new Date().getFullYear(),
}: DatePickerSimpleProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div className={cn("grid w-full max-w-xs gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "w-full justify-start gap-2 font-normal"
          )}
        >
          {date ? format(date, "PPP") : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date ?? new Date()}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            onSelect={(next) => {
              setDate(next)
              setOpen(false)
            }}
            className="rounded-none border-0 bg-transparent p-0 shadow-none"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
