/**
 * features/theme/hooks.js
 * PUBLIC SURFACE fitur theme — komponen import dari sini, bukan store.js langsung.
 * Bentuk return SAMA seperti useTheme() lama ({ theme, toggleTheme, isDark })
 * agar consumer existing cukup ganti import path.
 */
import { useThemeStore } from "./store";

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, toggleTheme, isDark: theme === "dark" };
}
