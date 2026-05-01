import type { OnboardingFormState } from "@/types/onboarding";
import type { PublicUser } from "@/types/user";

export function createInitialOnboardingForm(user: PublicUser | undefined): OnboardingFormState {
  const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const existingAvatar = (user?.avatar ?? "").trim();
  const avatarUrl =
    existingAvatar.startsWith("https://") || existingAvatar.startsWith("http://") ? existingAvatar : "";
  return {
    displayName: user?.name?.trim() || "",
    phoneDial: "+91",
    phoneLocal: "",
    dob: undefined,
    avatarUrl,
    avatarDataUrl: "",
    currency: user?.currency || "INR",
    timezone: user?.timezone || tzGuess,
    language: user?.language || "en",
    monthlyBudget: "",
    categories: [],
    linkedTypes: [],
    securityAck: false,
  };
}
