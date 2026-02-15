export const THEME_STORAGE_KEY = "vivian-theme-preference";

export const THEME_OPTIONS = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveDarkMode(theme: ThemePreference, systemPrefersDark: boolean): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemPrefersDark;
}

export function applyThemeToDocument(theme: ThemePreference) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDarkMode = resolveDarkMode(theme, systemPrefersDark);

  root.classList.toggle("dark", isDarkMode);
  root.style.colorScheme = isDarkMode ? "dark" : "light";
}
