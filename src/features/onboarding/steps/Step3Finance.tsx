import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  CreditCard,
  Info,
  Landmark,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAIAssist } from "@/features/onboarding/hooks/useAIAssist";
import { EXPENSE_CHIP_OPTIONS } from "@/lib/completeProfileData";
import { cn } from "@/lib/utils";
import type { LinkedAccountType, OnboardingFormState } from "@/types/onboarding";
import type { BudgetBreakdownData, BudgetVerdictData } from "@/types/onboardingAi";
import { toast } from "sonner";

const consentCacheRef: { text: string | null } = { text: null };

function matchSuggestionAmount(
  chipId: string,
  chipLabel: string,
  breakdown: { category: string; suggested_amount: number }[]
): number | null {
  const idL = chipId.toLowerCase();
  for (const row of breakdown) {
    const c = row.category.toLowerCase();
    if (c === idL || c.includes(idL) || idL.includes(c)) return row.suggested_amount;
  }
  const labelL = chipLabel.toLowerCase();
  for (const row of breakdown) {
    const c = row.category.toLowerCase();
    if (c.includes(labelL) || labelL.includes(c)) return row.suggested_amount;
  }
  return null;
}

export function Step3Finance() {
  const { control, watch, setValue } = useFormContext<OnboardingFormState>();
  const { budgetBreakdown, budgetVerdict, consentExplain } = useAIAssist();

  const categories = watch("categories");
  const currency = watch("currency");
  const monthlyBudget = watch("monthlyBudget");
  const linkedTypes = watch("linkedTypes");

  const [breakdownData, setBreakdownData] = useState<BudgetBreakdownData | null>(null);
  const [budgetCardOpen, setBudgetCardOpen] = useState(true);
  const [verdict, setVerdict] = useState<BudgetVerdictData | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentText, setConsentText] = useState<string | null>(consentCacheRef.text);
  const [consentLoading, setConsentLoading] = useState(false);

  const formatMoney = useCallback(
    (amount: number) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${currency} ${amount}`;
      }
    },
    [currency]
  );

  const budgetPreview = (() => {
    const raw = Number.parseFloat(monthlyBudget.replace(/,/g, "")) || 0;
    if (!currency || raw <= 0) return "—";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(raw);
    } catch {
      return String(raw);
    }
  })();

  /** Stable key so effects do not depend on a new `categories` array reference each render. */
  const categoriesKey = useMemo(() => [...categories].slice().sort().join("\0"), [categories]);

  const fetchBudgetBreakdown = budgetBreakdown.mutateAsync;
  const fetchBudgetVerdict = budgetVerdict.mutateAsync;

  useEffect(() => {
    if (categoriesKey.length === 0) {
      setBreakdownData(null);
      return;
    }
    const ids = categoriesKey.split("\0").filter(Boolean);
    const labels = ids.map((id) => EXPENSE_CHIP_OPTIONS.find((c) => c.id === id)?.label ?? id);

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await fetchBudgetBreakdown({ currency, categories: labels });
          if (!cancelled) setBreakdownData(data);
        } catch {
          if (!cancelled) setBreakdownData(null);
        }
      })();
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [categoriesKey, currency, fetchBudgetBreakdown]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const amount = Number.parseFloat(monthlyBudget.replace(/,/g, "")) || 0;
      const categoryIds = categoriesKey.length === 0 ? [] : categoriesKey.split("\0").filter(Boolean);
      if (amount <= 0 || categoryIds.length === 0) {
        setVerdict(null);
        setVerdictLoading(false);
        return;
      }
      setVerdictLoading(true);
      void fetchBudgetVerdict({ amount, currency, categories: categoryIds })
        .then((v) => {
          setVerdict(v);
        })
        .catch(() => {
          setVerdict(null);
        })
        .finally(() => {
          setVerdictLoading(false);
        });
    }, 800);
    return () => window.clearTimeout(handle);
  }, [monthlyBudget, categoriesKey, currency, fetchBudgetVerdict]);

  const onConsentOpenChange = (open: boolean): void => {
    setConsentOpen(open);
    if (!open) return;
    if (consentCacheRef.text) {
      setConsentText(consentCacheRef.text);
      return;
    }
    if (consentText) return;
    setConsentLoading(true);
    void consentExplain
      .mutateAsync()
      .then((text) => {
        if (text) {
          consentCacheRef.text = text;
          setConsentText(text);
        }
      })
      .catch(() => {
        setConsentText("We keep your data private and never ask for passwords or full card numbers in chat.");
      })
      .finally(() => setConsentLoading(false));
  };

  const addLinked = (type: LinkedAccountType): void => {
    if (linkedTypes.includes(type)) return;
    setValue("linkedTypes", [...linkedTypes, type], { shouldDirty: true });
    toast.success(`${type.toUpperCase()} linked (demo)`);
  };

  const verdictStyles =
    verdict?.verdict === "tight"
      ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
      : verdict?.verdict === "reasonable"
        ? "border-blue-500/35 bg-blue-500/10 text-blue-100"
        : verdict?.verdict === "comfortable"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
          : "";

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold leading-snug text-white">Finance setup</h2>

      <div className="space-y-5">
        <Label variant="onDark" htmlFor="ob-budget" className="mb-1.5 block text-sm font-medium text-foreground">
          Monthly budget
        </Label>
        <Controller
          name="monthlyBudget"
          control={control}
          render={({ field, fieldState }) => (
            <div className="w-full min-w-0">
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                  {currency}
                </span>
                <Input
                  id="ob-budget"
                  value={field.value}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.,]/g, "");
                    field.onChange(raw);
                  }}
                  onBlur={field.onBlur}
                  inputMode="decimal"
                  placeholder="0"
                  variant="onDark"
                  className="w-full pl-14 text-white placeholder:text-slate-600"
                />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Live preview: <span className="font-medium text-slate-300">{budgetPreview}</span>
              </p>
              <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2">
                {verdictLoading ? (
                  <Skeleton className="h-7 w-48 rounded-full bg-white/10" />
                ) : verdict ? (
                  <motion.div
                    key={`${verdict.verdict}-${verdict.message}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium normal-case",
                        verdictStyles
                      )}
                    >
                      <span className="mr-1.5">{verdict.emoji}</span>
                      <span className="capitalize">{verdict.verdict}</span>
                      <span className="mx-1.5 text-white/30">·</span>
                      <span>{verdict.message}</span>
                    </Badge>
                  </motion.div>
                ) : null}
              </div>
              {fieldState.error?.message ? (
                <p className="text-destructive mt-1.5 text-sm">{fieldState.error.message}</p>
              ) : null}
            </div>
          )}
        />
      </div>

      <div className="space-y-5">
        <Label variant="onDark" className="mb-1.5 block text-sm font-medium text-foreground">
          Expense categories
        </Label>
        <Controller
          name="categories"
          control={control}
          render={({ field, fieldState }) => (
            <div className="w-full min-w-0 space-y-2">
              <ToggleGroup
                type="multiple"
                value={field.value}
                onValueChange={(v) => field.onChange(v)}
                className="flex w-full flex-wrap justify-start gap-2"
              >
                {EXPENSE_CHIP_OPTIONS.map((chip) => {
                  const sug =
                    breakdownData?.breakdown && breakdownData.breakdown.length > 0
                      ? matchSuggestionAmount(chip.id, chip.label, breakdownData.breakdown)
                      : null;
                  return (
                    <ToggleGroupItem
                      key={chip.id}
                      value={chip.id}
                      aria-label={chip.label}
                      className="flex h-auto min-h-10 flex-col gap-0.5 px-3 py-2 data-[state=on]:border-[hsl(280_80%_65%)]/40"
                    >
                      <span>{chip.label}</span>
                      {sug != null ? (
                        <span className="text-[10px] font-normal leading-tight text-purple-200/90">
                          {formatMoney(sug)}
                        </span>
                      ) : null}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
              {fieldState.error?.message ? (
                <p className="text-destructive text-sm">{fieldState.error.message}</p>
              ) : null}
            </div>
          )}
        />
      </div>

      {categories.length > 0 ? (
        <Collapsible open={budgetCardOpen} onOpenChange={setBudgetCardOpen}>
          <Card className="border-[hsl(280_80%_65%)]/20 bg-[hsl(280_80%_65%)]/10 shadow-none">
            <CardContent className="space-y-3 px-4 py-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-purple-100">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-purple-300" aria-hidden />
                  💡 AI Budget Suggestion
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 transition-transform", budgetCardOpen && "rotate-180")}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[ending-style]:animate-out data-[starting-style]:animate-in">
                {budgetBreakdown.isPending ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-8 w-full bg-white/10" />
                    <Skeleton className="h-8 w-full bg-white/10" />
                    <Skeleton className="h-8 w-full bg-white/10" />
                  </div>
                ) : breakdownData && breakdownData.breakdown.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[hsl(222_30%_18%)] hover:bg-transparent">
                          <TableHead className="text-slate-300">Category</TableHead>
                          <TableHead className="text-right text-slate-300">Suggested</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakdownData.breakdown.map((row) => (
                          <TableRow key={row.category} className="border-[hsl(222_30%_18%)]">
                            <TableCell className="text-slate-200">{row.category}</TableCell>
                            <TableCell className="text-right font-medium text-white">
                              {formatMoney(row.suggested_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {breakdownData.total_suggested != null && Number.isFinite(breakdownData.total_suggested) ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-[hsl(280_80%_65%)]/30 bg-transparent text-purple-100 hover:bg-[hsl(280_80%_65%)]/10"
                        onClick={() =>
                          setValue("monthlyBudget", String(Math.round(breakdownData.total_suggested ?? 0)), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      >
                        Use suggested total: {formatMoney(breakdownData.total_suggested)}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No suggestion available right now.</p>
                )}
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
      ) : null}

      <div className="space-y-5">
        <Label variant="onDark" className="mb-1.5 block text-sm font-medium text-foreground">
          Linked accounts
        </Label>
        <p className="text-sm leading-relaxed text-slate-500">Optional — demo actions only.</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)] text-sm text-slate-200"
            onClick={() => addLinked("bank")}
          >
            <Landmark className="mr-2 h-4 w-4" />
            Bank
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)] text-sm text-slate-200"
            onClick={() => addLinked("upi")}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            UPI
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)] text-sm text-slate-200"
            onClick={() => addLinked("card")}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Card
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(222_30%_18%)] bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <Controller
            name="securityAck"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                className="mt-0.5 border-white/25"
              />
            )}
          />
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Label variant="onDark" className="mb-0 flex-1 cursor-pointer text-sm leading-relaxed text-slate-300">
              I understand this app and my financial data are confidential. Support will never ask for my password
              or full card number in chat.
            </Label>
            <Popover open={consentOpen} onOpenChange={onConsentOpenChange}>
              <PopoverTrigger
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[hsl(280_80%_65%)]/25 bg-[hsl(280_80%_65%)]/10 text-purple-200 transition-colors hover:bg-[hsl(280_80%_65%)]/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(252_87%_67%)]/50"
                aria-label="Explain this consent in plain language"
              >
                <Info className="size-4" aria-hidden />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-w-sm border-[hsl(280_80%_65%)]/25 bg-[hsl(222_40%_10%)] text-sm text-slate-200"
              >
                {consentLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-white/10" />
                    <Skeleton className="h-4 w-full bg-white/10" />
                  </div>
                ) : (
                  <p className="leading-relaxed">{consentText}</p>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
