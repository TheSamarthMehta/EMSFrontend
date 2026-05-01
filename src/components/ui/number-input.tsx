"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange"> {
  value: string | number;
  onValueChange: (value: string) => void;
}

function clampValue(value: number, min?: number, max?: number): number {
  if (typeof min === "number" && value < min) return min;
  if (typeof max === "number" && value > max) return max;
  return value;
}

function NumberInput({
  className,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  disabled,
  ...props
}: NumberInputProps) {
  const parsedStep = typeof step === "number" ? step : Number(step) || 1;
  const parsedMin = typeof min === "number" ? min : min !== undefined ? Number(min) : undefined;
  const parsedMax = typeof max === "number" ? max : max !== undefined ? Number(max) : undefined;

  const adjust = React.useCallback(
    (direction: 1 | -1) => {
      const currentRaw = typeof value === "number" ? value : Number(value);
      const base = Number.isFinite(currentRaw) ? currentRaw : 0;
      const next = clampValue(base + direction * parsedStep, parsedMin, parsedMax);
      onValueChange(String(next));
    },
    [onValueChange, parsedMax, parsedMin, parsedStep, value]
  );

  return (
    <InputGroup className={cn("h-9 border-border bg-background", className)} data-disabled={disabled}>
      <InputGroupInput
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
      <InputGroupAddon align="inline-end" className="pr-1">
        <InputGroupButton
          size="icon-xs"
          variant="ghost"
          aria-label="Decrease value"
          disabled={disabled}
          onClick={() => adjust(-1)}
        >
          <Minus />
        </InputGroupButton>
        <InputGroupButton
          size="icon-xs"
          variant="ghost"
          aria-label="Increase value"
          disabled={disabled}
          onClick={() => adjust(1)}
        >
          <Plus />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { NumberInput };
