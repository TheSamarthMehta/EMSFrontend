"use client"

import * as React from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon, CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Parse `yyyy-MM-dd` in local calendar (no UTC shift). */
export function parseYmd(ymd: string): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined
  const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? undefined : dt
}

export function formatYmd(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

export function DatePickerFooter({
  onClear,
  onSecondary,
  clearLabel = "Clear",
  secondaryLabel = "Today",
  showClear = true,
  showSecondary = true,
}: {
  onClear?: () => void
  onSecondary?: () => void
  clearLabel?: string
  secondaryLabel?: string
  showClear?: boolean
  showSecondary?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-2 py-2">
      {showClear && onClear ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          {clearLabel}
        </Button>
      ) : null}
      {showSecondary && onSecondary ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 px-3 text-xs font-medium shadow-none"
          onClick={onSecondary}
        >
          {secondaryLabel}
        </Button>
      ) : null}
    </div>
  )
}

const popoverCalendarClass = "rounded-none border-0 bg-transparent p-0 shadow-none"

export type DatePickerVariant = "default" | "onDark"

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  triggerClassName,
  variant = "default",
  captionLayout = "label",
  fromYear,
  toYear,
  min,
  max,
  align = "start",
  showClear = true,
  showToday = true,
}: {
  id?: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  variant?: DatePickerVariant
  captionLayout?: "label" | "dropdown"
  fromYear?: number
  toYear?: number
  min?: string
  max?: string
  align?: "start" | "center" | "end"
  showClear?: boolean
  showToday?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = React.useMemo(() => parseYmd(value), [value])

  const minDate = React.useMemo(() => (min ? parseYmd(min) : undefined), [min])
  const maxDate = React.useMemo(() => (max ? parseYmd(max) : undefined), [max])

  const triggerSurface =
    variant === "onDark"
      ? cn(
          "field-control-on-dark flex w-full cursor-pointer items-center justify-start gap-2 text-left font-normal text-slate-200 hover:bg-white/[0.06]"
        )
      : cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "w-full justify-start gap-2 text-left font-normal"
        )

  const display = selected ? format(selected, "dd-MM-yyyy") : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        data-slot="date-picker-trigger"
        className={cn(triggerSurface, className, triggerClassName)}
      >
        <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden />
        <span
          className={cn(
            "min-w-0 flex-1 truncate tabular-nums",
            !selected && "text-muted-foreground"
          )}
        >
          {display}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto overflow-hidden p-0"
        sideOffset={6}
      >
        <Calendar
          key={value || "empty"}
          mode="single"
          captionLayout={captionLayout}
          fromYear={fromYear}
          toYear={toYear}
          selected={selected}
          onSelect={(d) => {
            if (!d) return
            onChange(formatYmd(d))
            setOpen(false)
          }}
          defaultMonth={selected ?? new Date()}
          disabled={(d) => {
            if (minDate && d < stripTime(minDate)) return true
            if (maxDate && d > stripTime(maxDate)) return true
            return false
          }}
          className={popoverCalendarClass}
        />
        {showClear || showToday ? (
          <DatePickerFooter
            showClear={showClear}
            showSecondary={showToday}
            onClear={
              showClear
                ? () => {
                    onChange("")
                    setOpen(false)
                  }
                : undefined
            }
            onSecondary={
              showToday
                ? () => {
                    onChange(formatYmd(new Date()))
                    setOpen(false)
                  }
                : undefined
            }
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function DateRangePicker({
  value,
  onChange,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  placeholder = "Date range",
  align = "end",
  numberOfMonths = 2,
  triggerClassName,
  disabled,
}: {
  value: DateRange | undefined
  onChange: (next: DateRange | undefined) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placeholder?: string
  align?: "start" | "center" | "end"
  numberOfMonths?: 1 | 2
  triggerClassName?: string
  disabled?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChangeProp?.(next)
      if (!isControlled) setUncontrolledOpen(next)
    },
    [isControlled, onOpenChangeProp]
  )

  const label =
    value?.from && value?.to
      ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`
      : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-7 min-w-0 justify-start gap-2 px-2.5 text-[11px] font-normal transition-shadow duration-200 hover:shadow-sm",
          triggerClassName
        )}
      >
        <CalendarDays className="size-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto overflow-hidden p-0"
        sideOffset={6}
      >
        <Calendar
          mode="range"
          numberOfMonths={numberOfMonths}
          selected={value}
          onSelect={onChange}
          defaultMonth={value?.from ?? new Date()}
          className={cn(popoverCalendarClass, numberOfMonths === 2 && "sm:p-2")}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange(undefined)
              setOpen(false)
            }}
          >
            Clear
          </Button>
          <Button type="button" size="sm" className="h-8 px-3 text-xs font-medium" onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
