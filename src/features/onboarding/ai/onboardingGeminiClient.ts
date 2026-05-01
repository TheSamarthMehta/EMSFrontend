/**
 * Onboarding AI — calls the backend Gemini proxy (`/ai/onboarding/*`). API keys stay on the server.
 */
import {
  postOnboardingBudgetBreakdown,
  postOnboardingBudgetVerdict,
  postOnboardingConsentExplain,
  postOnboardingDetectPreferences,
  postOnboardingFormatName,
  postOnboardingProfileSummary,
} from "@/api/onboardingAi";
import type {
  BudgetBreakdownData,
  BudgetVerdictData,
  DetectPreferencesData,
} from "@/types/onboardingAi";

export async function formatDisplayNameWithGemini(raw: string): Promise<string | null> {
  const res = await postOnboardingFormatName(raw);
  if (!res.ok || !res.formatted) return null;
  return res.formatted;
}

export async function detectPreferencesWithGemini(ctx: {
  timezone: string;
  locale: string;
}): Promise<DetectPreferencesData | null> {
  const res = await postOnboardingDetectPreferences(ctx);
  if (!res.ok || !res.data) return null;
  return res.data;
}

export async function suggestBudgetBreakdownWithGemini(ctx: {
  currency: string;
  categories: string[];
}): Promise<BudgetBreakdownData | null> {
  const res = await postOnboardingBudgetBreakdown(ctx);
  if (!res.ok || !res.data) return null;
  return res.data;
}

export async function analyzeBudgetVerdictWithGemini(ctx: {
  amount: number;
  currency: string;
  categories: string[];
}): Promise<BudgetVerdictData | null> {
  const res = await postOnboardingBudgetVerdict(ctx);
  if (!res.ok || !res.data) return null;
  return res.data;
}

export async function generateProfileSummaryWithGemini(ctx: {
  name: string;
  currency: string;
  timezone: string;
  categories: string[];
  monthlyBudget: number;
}): Promise<string | null> {
  const res = await postOnboardingProfileSummary(ctx);
  if (!res.ok || !res.summary) return null;
  return res.summary;
}

export async function explainConsentWithGemini(): Promise<string | null> {
  const res = await postOnboardingConsentExplain();
  if (!res.ok || !res.explanation) return null;
  return res.explanation;
}
