import { useMemo } from "react";

export type PasswordStrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export interface PasswordStrengthResult {
  score: number;
  label: PasswordStrengthLabel;
  progress: number;
  colorClass: string;
}

function computePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score, label: "Weak", progress: 25, colorClass: "bg-red-500" };
  }
  if (score === 2) {
    return { score, label: "Fair", progress: 45, colorClass: "bg-amber-500" };
  }
  if (score <= 4) {
    return { score, label: "Good", progress: 70, colorClass: "bg-blue-500" };
  }
  return { score, label: "Strong", progress: 100, colorClass: "bg-emerald-500" };
}

export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => computePasswordStrength(password), [password]);
}
