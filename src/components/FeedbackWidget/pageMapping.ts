import type { FeedbackPageValue } from "./constants";

/** Map current pathname to Select `value` for page / location. */
export function pathnameToFeedbackPage(pathname: string): FeedbackPageValue {
  const p = pathname.replace(/\/+$/, "") || "/";

  if (p === "/complete-profile") return "onboarding-personal";
  if (p === "/dashboard" || p === "/") return "dashboard";
  if (p === "/expenses") return "expense-list";
  if (p === "/reports") return "reports";
  if (p === "/settings") return "settings";
  if (p === "/budget") return "other";

  if (p.startsWith("/groups")) return "other";

  return "other";
}

export function pageValueToLabel(value: string): string {
  switch (value) {
    case "onboarding-personal":
      return "Onboarding — Personal";
    case "onboarding-preferences":
      return "Onboarding — Preferences";
    case "onboarding-finance":
      return "Onboarding — Finance";
    case "dashboard":
      return "Dashboard";
    case "expense-list":
      return "Expense List";
    case "add-expense":
      return "Add Expense";
    case "reports":
      return "Reports";
    case "settings":
      return "Settings";
    default:
      return "Other";
  }
}
