import { api } from "@/api/client";
import type {
  BudgetBreakdownResponse,
  BudgetVerdictResponse,
  ConsentExplainResponse,
  DetectPreferencesResponse,
  FormatNameResponse,
  ProfileSummaryResponse,
} from "@/types/onboardingAi";

export async function postOnboardingFormatName(rawName: string): Promise<FormatNameResponse> {
  const { data } = await api.post<FormatNameResponse>("/ai/onboarding/format-name", { rawName });
  return data;
}

export async function postOnboardingDetectPreferences(payload: {
  timezone: string;
  locale: string;
}): Promise<DetectPreferencesResponse> {
  const { data } = await api.post<DetectPreferencesResponse>("/ai/onboarding/detect-preferences", payload);
  return data;
}

export async function postOnboardingBudgetBreakdown(payload: {
  currency: string;
  categories: string[];
}): Promise<BudgetBreakdownResponse> {
  const { data } = await api.post<BudgetBreakdownResponse>("/ai/onboarding/budget-breakdown", payload);
  return data;
}

export async function postOnboardingBudgetVerdict(payload: {
  amount: number;
  currency: string;
  categories: string[];
}): Promise<BudgetVerdictResponse> {
  const { data } = await api.post<BudgetVerdictResponse>("/ai/onboarding/budget-verdict", payload);
  return data;
}

export async function postOnboardingProfileSummary(payload: {
  name: string;
  currency: string;
  timezone: string;
  categories: string[];
  monthlyBudget: number;
}): Promise<ProfileSummaryResponse> {
  const { data } = await api.post<ProfileSummaryResponse>("/ai/onboarding/profile-summary", payload);
  return data;
}

export async function postOnboardingConsentExplain(): Promise<ConsentExplainResponse> {
  const { data } = await api.post<ConsentExplainResponse>("/ai/onboarding/consent-explain", {});
  return data;
}
