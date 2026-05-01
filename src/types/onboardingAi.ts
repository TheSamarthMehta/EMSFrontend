export type OnboardingAiFailureReason = "not_configured" | "unavailable";

export interface OnboardingAiBaseResponse {
  ok: boolean;
  reason?: OnboardingAiFailureReason;
}

export interface FormatNameResponse extends OnboardingAiBaseResponse {
  formatted?: string;
}

export interface DetectPreferencesData {
  currency_code: string;
  currency_label: string;
  timezone: string;
  language: string;
}

export interface DetectPreferencesResponse extends OnboardingAiBaseResponse {
  data?: DetectPreferencesData;
}

export interface BudgetBreakdownRow {
  category: string;
  suggested_amount: number;
}

export interface BudgetBreakdownData {
  breakdown: BudgetBreakdownRow[];
  total_suggested: number | null;
}

export interface BudgetBreakdownResponse extends OnboardingAiBaseResponse {
  data?: BudgetBreakdownData;
}

export interface BudgetVerdictData {
  verdict: "tight" | "reasonable" | "comfortable";
  message: string;
  emoji: string;
}

export interface BudgetVerdictResponse extends OnboardingAiBaseResponse {
  data?: BudgetVerdictData;
}

export interface ProfileSummaryResponse extends OnboardingAiBaseResponse {
  summary?: string;
}

export interface ConsentExplainResponse extends OnboardingAiBaseResponse {
  explanation?: string;
}
