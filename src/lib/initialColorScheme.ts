/** One-time sync of the `dark` class from OS preference (no user theme toggle). */
export function applyInitialColorScheme(): void {
  if (typeof window === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", prefersDark);
}
