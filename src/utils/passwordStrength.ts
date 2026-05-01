type PasswordStrengthScore = 0 | 1 | 2 | 3;

interface PasswordStrengthResult {
  score: PasswordStrengthScore;
  label: string;
  color: string;
  width: string;
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: "", color: "bg-transparent", width: "w-0" };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (password.length < 6) {
    return { score: 1, label: "Weak", color: "bg-red-500", width: "w-1/4" };
  }

  if (password.length >= 10 && hasUppercase && hasNumber && hasSpecial) {
    return { score: 3, label: "Strong", color: "bg-emerald-500", width: "w-full" };
  }

  return { score: 2, label: "Medium", color: "bg-yellow-500", width: "w-2/4" };
}
