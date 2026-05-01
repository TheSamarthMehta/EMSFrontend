export type OnboardingStepIndex = 0 | 1 | 2;

export type LinkedAccountType = "bank" | "upi" | "card";

export interface OnboardingFormState {
  displayName: string;
  phoneDial: string;
  phoneLocal: string;
  /** Optional; schema uses `z.date().optional()`. */
  dob?: Date | undefined;
  /** HTTPS avatar URL after successful Cloudinary upload (preferred). */
  avatarUrl: string;
  /** Legacy tiny preview / fallback only; avoid large payloads in patchMe. */
  avatarDataUrl: string;
  currency: string;
  timezone: string;
  language: string;
  monthlyBudget: string;
  categories: string[];
  linkedTypes: LinkedAccountType[];
  securityAck: boolean;
}

export type ChecklistStatus = "done" | "active" | "pending";

export interface ChecklistRow {
  id: "personal" | "preferences" | "finance" | "security";
  label: string;
  status: ChecklistStatus;
}
