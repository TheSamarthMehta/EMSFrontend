import { useMutation } from "@tanstack/react-query";

import {
  analyzeBudgetVerdictWithGemini,
  detectPreferencesWithGemini,
  explainConsentWithGemini,
  formatDisplayNameWithGemini,
  generateProfileSummaryWithGemini,
  suggestBudgetBreakdownWithGemini,
} from "@/features/onboarding/ai/onboardingGeminiClient";

/**
 * Shared onboarding AI mutations (Google Gemini via backend).
 */
export function useAIAssist() {
  const formatDisplayName = useMutation({
    mutationFn: (raw: string) => formatDisplayNameWithGemini(raw),
  });

  const detectPreferences = useMutation({
    mutationFn: (ctx: { timezone: string; locale: string }) => detectPreferencesWithGemini(ctx),
  });

  const budgetBreakdown = useMutation({
    mutationFn: (ctx: { currency: string; categories: string[] }) => suggestBudgetBreakdownWithGemini(ctx),
  });

  const budgetVerdict = useMutation({
    mutationFn: (ctx: { amount: number; currency: string; categories: string[] }) =>
      analyzeBudgetVerdictWithGemini(ctx),
  });

  const profileSummary = useMutation({
    mutationFn: (ctx: {
      name: string;
      currency: string;
      timezone: string;
      categories: string[];
      monthlyBudget: number;
    }) => generateProfileSummaryWithGemini(ctx),
  });

  const consentExplain = useMutation({
    mutationFn: () => explainConsentWithGemini(),
  });

  return {
    formatDisplayName,
    detectPreferences,
    budgetBreakdown,
    budgetVerdict,
    profileSummary,
    consentExplain,
  };
}
