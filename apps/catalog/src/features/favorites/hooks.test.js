import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const favState = { kodes: [], toggle: vi.fn(), clear: vi.fn() };
vi.mock("./store", () => ({
  useFavoritesStore: (selector) => selector(favState),
}));

const { useFavorites } = await import("./hooks");

beforeEach(() => {
  favState.kodes = [];
  favState.toggle.mockReset();
  favState.clear.mockReset();
});

describe("useFavorites", () => {
  it("favoriteKodes adalah Set dari kodes, count sesuai panjang array", () => {
    favState.kodes = ["D-07-OSK", "D-08-SFN"];
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favoriteKodes.has("D-07-OSK")).toBe(true);
    expect(result.current.favoriteKodes.has("D-99-XXX")).toBe(false);
    expect(result.current.count).toBe(2);
  });

  it("favoriteKodes Set kosong & count 0 saat kodes kosong", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favoriteKodes.size).toBe(0);
    expect(result.current.count).toBe(0);
  });

  it("meneruskan toggle & clear dari store", () => {
    const { result } = renderHook(() => useFavorites());
    result.current.toggle("D-07-OSK");
    result.current.clear();
    expect(favState.toggle).toHaveBeenCalledWith("D-07-OSK");
    expect(favState.clear).toHaveBeenCalledTimes(1);
  });
});
