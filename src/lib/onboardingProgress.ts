import type { ChecklistRow, OnboardingFormState } from "@/types/onboarding";

export function computeProgressPercent(state: OnboardingFormState): number {
  let p = 4;
  const name = state.displayName.trim();
  if (name.length >= 1) p += 6;
  if (name.length >= 2) p += 8;
  if (state.avatarDataUrl.length > 0 || state.avatarUrl.trim().length > 0) p += 10;
  const phoneDigits = state.phoneLocal.replace(/\D/g, "");
  if (phoneDigits.length >= 8) p += 7;
  if (state.dob) p += 5;
  if (state.currency.length > 0) p += 10;
  if (state.timezone.length > 0) p += 10;
  if (state.language.length > 0) p += 8;
  const budget = Number.parseFloat(state.monthlyBudget.replace(/,/g, "")) || 0;
  if (budget > 0) p += 12;
  if (state.categories.length > 0) p += 10;
  if (state.linkedTypes.length > 0) p += 4;
  if (state.securityAck) p += 5;
  return Math.min(100, Math.round(p));
}

export function getMotivationalCopy(percent: number): string {
  if (percent >= 100) return "You're all set 🎉";
  if (percent >= 71) return "Almost there!";
  if (percent >= 31) return "Looking good! Keep going";
  return "Let's get you set up";
}

export function isPersonalValid(state: OnboardingFormState): boolean {
  return state.displayName.trim().length >= 2;
}

export function isPreferencesValid(state: OnboardingFormState): boolean {
  return Boolean(state.currency) && Boolean(state.timezone) && Boolean(state.language);
}

export function isFinanceValid(state: OnboardingFormState): boolean {
  const budget = Number.parseFloat(state.monthlyBudget.replace(/,/g, "")) || 0;
  return budget > 0 && state.categories.length > 0;
}

export function buildChecklistRows(
  step: 0 | 1 | 2,
  state: OnboardingFormState,
  wizardComplete: boolean
): ChecklistRow[] {
  const personalDone = isPersonalValid(state);
  const preferencesDone = isPreferencesValid(state);
  const financeDone = isFinanceValid(state);

  const personalStatus = personalDone ? "done" : step === 0 ? "active" : "pending";
  const preferencesStatus = !personalDone
    ? "pending"
    : preferencesDone
      ? "done"
      : step === 1
        ? "active"
        : step > 1
          ? "done"
          : "pending";
  const financeStatus = !preferencesDone
    ? "pending"
    : financeDone
      ? "done"
      : step === 2
        ? "active"
        : "pending";
  const securityStatus = wizardComplete
    ? "done"
    : !financeDone
      ? "pending"
      : step === 2 && !state.securityAck
        ? "active"
        : state.securityAck
          ? "done"
          : "pending";

  return [
    { id: "personal", label: "Personal info", status: personalStatus },
    { id: "preferences", label: "Preferences", status: preferencesStatus },
    { id: "finance", label: "Finance setup", status: financeStatus },
    { id: "security", label: "Security", status: securityStatus },
  ];
}
