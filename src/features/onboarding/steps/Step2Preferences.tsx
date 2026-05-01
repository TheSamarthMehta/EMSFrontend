import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIAssist } from "@/features/onboarding/hooks/useAIAssist";
import {
  LANGUAGE_OPTIONS,
  ONBOARDING_CURRENCIES,
} from "@/lib/completeProfileData";
import { TIMEZONE_OPTIONS } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { OnboardingFormState } from "@/types/onboarding";

type AiFieldTag = { currency: boolean; timezone: boolean; language: boolean };

function normalizeTimezone(aiTz: string, browserTz: string): string {
  const trimmed = aiTz.trim();
  const exact = TIMEZONE_OPTIONS.find((o) => o.value === trimmed)?.value;
  if (exact) return exact;
  const byLabel = TIMEZONE_OPTIONS.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())?.value;
  if (byLabel) return byLabel;
  const segment = trimmed.split("/").pop()?.toLowerCase() ?? "";
  const fuzzy = TIMEZONE_OPTIONS.find((o) => o.value.toLowerCase().includes(segment) && segment.length > 2)
    ?.value;
  if (fuzzy) return fuzzy;
  const browserMatch = TIMEZONE_OPTIONS.find((o) => o.value === browserTz)?.value;
  return browserMatch ?? "UTC";
}

export function Step2Preferences() {
  const { control, setValue, watch } = useFormContext<OnboardingFormState>();
  const { detectPreferences } = useAIAssist();

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [aiTags, setAiTags] = useState<AiFieldTag>({
    currency: false,
    timezone: false,
    language: false,
  });
  const ranPrefAi = useRef(false);

  const currency = watch("currency");

  useEffect(() => {
    if (ranPrefAi.current) return;
    ranPrefAi.current = true;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const locale = navigator.language || "en-US";

    void (async () => {
      try {
        const data = await detectPreferences.mutateAsync({ timezone: browserTz, locale });
        if (!data) return;

        const code = data.currency_code.toUpperCase();
        const currencyOk = ONBOARDING_CURRENCIES.some((c) => c.code === code) ? code : "INR";

        const lang = LANGUAGE_OPTIONS.some((l) => l.code === data.language) ? data.language : "en";

        const tzNorm = normalizeTimezone(data.timezone, browserTz);

        setValue("currency", currencyOk, { shouldValidate: true, shouldDirty: true });
        setValue("timezone", tzNorm, { shouldValidate: true, shouldDirty: true });
        setValue("language", lang, { shouldValidate: true, shouldDirty: true });
        setAiTags({ currency: true, timezone: true, language: true });
      } catch {
        /* silent */
      }
    })();
  }, [detectPreferences.mutateAsync, setValue]);

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold leading-snug text-white">Preferences</h2>

      {detectPreferences.isPending ? (
        <div className="space-y-3 rounded-xl border border-[hsl(280_80%_65%)]/20 bg-[hsl(280_80%_65%)]/5 p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-purple-200">
            <span aria-hidden>✨</span> Detecting locale preferences…
          </p>
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Label variant="onDark" className="mb-1.5 block w-full text-sm font-medium text-foreground">
            Currency
          </Label>
          {aiTags.currency ? (
            <Badge
              variant="secondary"
              className="border-[hsl(280_80%_65%)]/30 bg-[hsl(280_80%_65%)]/10 text-[11px] text-purple-100"
            >
              🤖 AI suggested
            </Badge>
          ) : null}
        </div>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
              <PopoverTrigger
                className={cn(
                  "field-control-on-dark flex w-full min-w-0 items-center justify-between gap-2 font-normal text-slate-100 hover:bg-white/[0.08]"
                )}
                aria-expanded={currencyOpen}
              >
                {(() => {
                  const cur = ONBOARDING_CURRENCIES.find((c) => c.code === field.value);
                  return cur ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <span>{cur.flag}</span>
                      <span>{cur.code}</span>
                      <span className="text-slate-500">—</span>
                      <span className="truncate text-slate-400">{cur.label.split("—")[1]?.trim()}</span>
                    </span>
                  ) : (
                    "Select currency"
                  );
                })()}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </PopoverTrigger>
              <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
                <Command className="rounded-lg border border-white/10 bg-[#0f1629] text-white">
                  <CommandInput placeholder="Search currency…" className="text-white" />
                  <CommandList>
                    <CommandEmpty>No currency found.</CommandEmpty>
                    <CommandGroup>
                      {ONBOARDING_CURRENCIES.map((c) => (
                        <CommandItem
                          key={c.code}
                          value={`${c.code} ${c.label}`}
                          onSelect={() => {
                            field.onChange(c.code);
                            setCurrencyOpen(false);
                            setAiTags((t) => ({ ...t, currency: false }));
                          }}
                          className="text-white"
                        >
                          <span className="mr-2">{c.flag}</span>
                          {c.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Label variant="onDark" className="mb-1.5 block w-full text-sm font-medium text-foreground">
            Timezone
          </Label>
          {aiTags.timezone ? (
            <Badge
              variant="secondary"
              className="border-[hsl(280_80%_65%)]/30 bg-[hsl(280_80%_65%)]/10 text-[11px] text-purple-100"
            >
              🤖 AI suggested
            </Badge>
          ) : null}
        </div>
        <Controller
          name="timezone"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v ? String(v) : field.value);
                setAiTags((t) => ({ ...t, timezone: false }));
              }}
            >
              <SelectTrigger variant="onDark" className="w-full text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Label variant="onDark" className="mb-1.5 block w-full text-sm font-medium text-foreground">
            Language
          </Label>
          {aiTags.language ? (
            <Badge
              variant="secondary"
              className="border-[hsl(280_80%_65%)]/30 bg-[hsl(280_80%_65%)]/10 text-[11px] text-purple-100"
            >
              🤖 AI suggested
            </Badge>
          ) : null}
        </div>
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v ? String(v) : field.value);
                setAiTags((t) => ({ ...t, language: false }));
              }}
            >
              <SelectTrigger variant="onDark" className="w-full text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Currency preview: <span className="font-medium text-slate-300">{currency}</span>
      </p>
    </div>
  );
}
