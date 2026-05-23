/**
 * useTheme.js
 * Hook untuk toggle light/dark mode di admin dan pos.
 * Menyimpan preferensi ke localStorage dan menerapkan class "dark" ke <html>.
 *
 * applyTheme dipanggil:
 * 1. Saat module di-load (IIFE) — sebelum React mount, tanpa flash
 * 2. Synchronous di dalam toggleTheme — efek instan saat diklik
 * 3. Di useEffect [theme] — sebagai safeguard / SSR fallback
 */
import { useState, useEffect } from "react";

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

// ── Terapkan tema segera saat module di-load (sebelum React mount) ────────────
const _initialTheme = (() => {
  try {
    const stored = getStored();
    if (stored) { applyTheme(stored); return stored; }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const t = prefersDark ? "dark" : "light";
    applyTheme(t);
    return t;
  } catch {
    return "light";
  }
})();

export function useTheme() {
  const [theme, setTheme] = useState(_initialTheme);

  // Safeguard: sync ke DOM setiap kali theme berubah
  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      // Synchronous DOM update — tidak tunggu useEffect
      applyTheme(next);
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
  }

  return { theme, toggleTheme, isDark: theme === "dark" };
}
