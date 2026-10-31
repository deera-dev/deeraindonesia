import { create } from "zustand";

const KEY = "deera-theme";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

function getStored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return null;
}

function applyTheme(theme: Theme): void {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const _initialTheme: Theme = (() => {
  try {
    const stored = getStored();
    if (stored) {
      applyTheme(stored);
      return stored;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const t: Theme = prefersDark ? "dark" : "light";
    applyTheme(t);
    return t;
  } catch {
    return "light";
  }
})();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: _initialTheme,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    set({ theme: next });
  },
}));
