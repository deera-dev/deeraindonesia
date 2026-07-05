import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const themeState = { theme: "light", toggleTheme: vi.fn() };
const useThemeStore = vi.fn((selector) => selector(themeState));

vi.mock("./store", () => ({ useThemeStore: (...args) => useThemeStore(...args) }));

const { useTheme } = await import("./hooks");

describe("useTheme", () => {
  beforeEach(() => {
    themeState.theme = "light";
    themeState.toggleTheme = vi.fn();
  });

  it("mengembalikan theme, toggleTheme, dan isDark=false saat tema light", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(result.current.isDark).toBe(false);
    expect(result.current.toggleTheme).toBe(themeState.toggleTheme);
  });

  it("isDark=true saat tema dark", () => {
    themeState.theme = "dark";

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });
});
