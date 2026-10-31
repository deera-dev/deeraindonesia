import { useThemeStore } from "./store";

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, toggleTheme, isDark: theme === "dark" };
}
