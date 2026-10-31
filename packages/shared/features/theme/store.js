import { create } from "zustand";

const KEY = "deera-theme";

function getStored() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return null;
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const _initialTheme = (() => {
  try {
    const stored = getStored();
    if (stored) {
      applyTheme(stored);
      return stored;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const t = prefersDark ? "dark" : "light";
    applyTheme(t);
    return t;
  } catch {
    return "light";
  }
})();

export const useThemeStore = create((set, get) => ({
  theme: _initialTheme,
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    set({ theme: next });
  },
}));
