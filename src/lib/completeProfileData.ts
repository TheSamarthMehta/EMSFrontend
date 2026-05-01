import { CURRENCY_OPTIONS } from "@/lib/currencies";

const CURRENCY_TO_REGION: Record<string, string> = {
  INR: "IN",
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  AUD: "AU",
  CAD: "CA",
  JPY: "JP",
  SGD: "SG",
  AED: "AE",
};

/** Regional-indicator flag emoji for currency row (best-effort). */
export function flagEmojiForCurrency(code: string): string {
  const region = CURRENCY_TO_REGION[code];
  if (!region) {
    return "🏳️";
  }
  if (region === "EU") {
    return "🇪🇺";
  }
  return [...region]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export const ONBOARDING_CURRENCIES = CURRENCY_OPTIONS.map((entry) => ({
  code: entry.code,
  label: entry.label,
  flag: flagEmojiForCurrency(entry.code),
}));

export interface DialCodeOption {
  readonly dial: string;
  readonly label: string;
}

export const DIAL_CODE_OPTIONS: ReadonlyArray<DialCodeOption> = [
  { dial: "+1", label: "+1 United States" },
  { dial: "+44", label: "+44 United Kingdom" },
  { dial: "+91", label: "+91 India" },
  { dial: "+971", label: "+971 UAE" },
  { dial: "+65", label: "+65 Singapore" },
  { dial: "+61", label: "+61 Australia" },
  { dial: "+81", label: "+81 Japan" },
  { dial: "+49", label: "+49 Germany" },
  { dial: "+33", label: "+33 France" },
  { dial: "+34", label: "+34 Spain" },
] as const;

export interface LanguageOption {
  readonly code: string;
  readonly nativeName: string;
}

export const LANGUAGE_OPTIONS: ReadonlyArray<LanguageOption> = [
  { code: "en", nativeName: "English" },
  { code: "hi", nativeName: "हिन्दी" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "de", nativeName: "Deutsch" },
  { code: "ja", nativeName: "日本語" },
  { code: "zh", nativeName: "中文" },
  { code: "ar", nativeName: "العربية" },
] as const;

export const EXPENSE_CHIP_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "food", label: "Food" },
  { id: "transport", label: "Transport" },
  { id: "shopping", label: "Shopping" },
  { id: "bills", label: "Bills" },
  { id: "health", label: "Health" },
  { id: "entertainment", label: "Entertainment" },
  { id: "other", label: "Other" },
] as const;
