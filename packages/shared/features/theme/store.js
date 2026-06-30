/**
 * features/theme/store.js
 * Zustand store untuk light/dark mode di admin dan pos.
 * Menyimpan preferensi ke localStorage (key sama seperti versi lama, "deera-theme")
 * dan menerapkan class "dark" ke <html>.
 *
 * applyTheme dipanggil:
 * 1. Saat module di-load (IIFE) — sebelum React mount, tanpa flash
 * 2. Synchronous di dalam toggleTheme — efek instan saat diklik
 */
import { create } from "zustand";

const KEY = "deera-theme";

function getStored() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// ── Terapkan tema segera saat module di-load (sebelum React mount) ────────────
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
    // Synchronous DOM update — tidak tunggu re-render React
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    set({ theme: next });
  },
}));
