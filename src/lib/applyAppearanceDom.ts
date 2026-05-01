import { ACCENT_HEX, type AccentKey } from "@/features/settings/settingsConstants";

export type AppearancePayload = {
  theme: "light" | "dark" | "system";
  accentColor: AccentKey;
  compactMode: boolean;
  showCentsInAmounts: boolean;
  defaultLandingPage: string;
};

export function applyAppearanceSettings(settings: AppearancePayload) {
  const root = document.documentElement;
  if (settings.theme === "dark") {
    root.classList.add("dark");
  } else if (settings.theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }

  const hex = ACCENT_HEX[settings.accentColor] ?? ACCENT_HEX.indigo;
  root.style.setProperty("--primary", hex);

  if (settings.compactMode) {
    root.setAttribute("data-compact", "true");
  } else {
    root.removeAttribute("data-compact");
  }
}
