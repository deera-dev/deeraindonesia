import { describe, it, expect, beforeEach } from "vitest";
import { useFavoritesStore } from "./store";

beforeEach(() => {
  localStorage.clear();
  useFavoritesStore.setState({ kodes: [] });
});

describe("useFavoritesStore", () => {
  it("toggle() menambah kode yang belum ada", () => {
    useFavoritesStore.getState().toggle("D-07-OSK");
    expect(useFavoritesStore.getState().kodes).toEqual(["D-07-OSK"]);
  });

  it("toggle() menghapus kode yang sudah ada", () => {
    useFavoritesStore.setState({ kodes: ["D-07-OSK", "D-08-SFN"] });
    useFavoritesStore.getState().toggle("D-07-OSK");
    expect(useFavoritesStore.getState().kodes).toEqual(["D-08-SFN"]);
  });

  it("isFavorite() mengecek keberadaan kode", () => {
    useFavoritesStore.setState({ kodes: ["D-07-OSK"] });
    expect(useFavoritesStore.getState().isFavorite("D-07-OSK")).toBe(true);
    expect(useFavoritesStore.getState().isFavorite("D-99-XXX")).toBe(false);
  });

  it("clear() mengosongkan semua favorit", () => {
    useFavoritesStore.setState({ kodes: ["D-07-OSK", "D-08-SFN"] });
    useFavoritesStore.getState().clear();
    expect(useFavoritesStore.getState().kodes).toEqual([]);
  });

  it("persist ke localStorage dengan key deera-catalog-favorites", () => {
    useFavoritesStore.getState().toggle("D-07-OSK");
    const raw = localStorage.getItem("deera-catalog-favorites");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.state.kodes).toEqual(["D-07-OSK"]);
  });
});
