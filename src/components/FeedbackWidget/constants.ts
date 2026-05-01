import type { FeedbackType } from "@/types/feedback";

export const FEEDBACK_RECIPIENT_EMAIL = "expensemanagertrackerno1@gmail.com";

export const FEEDBACK_PAGE_OPTIONS = [
  { value: "onboarding-personal", label: "Onboarding — Personal" },
  { value: "onboarding-preferences", label: "Onboarding — Preferences" },
  { value: "onboarding-finance", label: "Onboarding — Finance" },
  { value: "dashboard", label: "Dashboard" },
  { value: "expense-list", label: "Expense List" },
  { value: "add-expense", label: "Add Expense" },
  { value: "reports", label: "Reports" },
  { value: "settings", label: "Settings" },
  { value: "other", label: "Other" },
] as const;

export type FeedbackPageValue = (typeof FEEDBACK_PAGE_OPTIONS)[number]["value"];

export const TYPE_META: Record<
  FeedbackType,
  { label: string; border: string; bg: string; text: string; ring: string }
> = {
  bug: {
    label: "Bug report",
    border: "hsl(0 72% 51%)",
    bg: "hsl(0 72% 51% / 0.15)",
    text: "hsl(0 72% 51%)",
    ring: "hsl(0 72% 51% / 0.35)",
  },
  feature: {
    label: "Feature idea",
    border: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 50% / 0.15)",
    text: "hsl(38 92% 50%)",
    ring: "hsl(38 92% 50% / 0.35)",
  },
  ui: {
    label: "UI / Design",
    border: "hsl(213 94% 68%)",
    bg: "hsl(213 94% 68% / 0.15)",
    text: "hsl(213 94% 68%)",
    ring: "hsl(213 94% 68% / 0.35)",
  },
  other: {
    label: "General",
    border: "hsl(158 64% 40%)",
    bg: "hsl(158 64% 40% / 0.15)",
    text: "hsl(158 64% 40%)",
    ring: "hsl(158 64% 40% / 0.35)",
  },
};

export const FEEDBACK_PULSE_STORAGE_KEY = "ems_feedback_widget_pulse_dismissed";
