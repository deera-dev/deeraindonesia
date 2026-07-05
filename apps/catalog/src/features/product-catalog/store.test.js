import { describe, it, expect, beforeEach } from "vitest";
import { useVisitUsModalStore } from "./store";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

beforeEach(() => {
  localStorage.clear();
  useVisitUsModalStore.setState({ lastShownDate: null, open: false });
});

describe("useVisitUsModalStore", () => {
  it("initOpen membuka modal saat lastShownDate belum hari ini (null)", () => {
    useVisitUsModalStore.getState().initOpen();
    expect(useVisitUsModalStore.getState().open).toBe(true);
  });

  it("initOpen TIDAK membuka modal saat lastShownDate sudah hari ini", () => {
    useVisitUsModalStore.setState({ lastShownDate: todayStr() });
    useVisitUsModalStore.getState().initOpen();
    expect(useVisitUsModalStore.getState().open).toBe(false);
  });

  it("show() membuka modal", () => {
    useVisitUsModalStore.getState().show();
    expect(useVisitUsModalStore.getState().open).toBe(true);
  });

  it("close() menutup modal & mencatat lastShownDate hari ini", () => {
    useVisitUsModalStore.getState().show();
    useVisitUsModalStore.getState().close();
    const state = useVisitUsModalStore.getState();
    expect(state.open).toBe(false);
    expect(state.lastShownDate).toBe(todayStr());
  });

  it("persist hanya menyimpan lastShownDate (partialize), bukan open", () => {
    useVisitUsModalStore.getState().show();
    useVisitUsModalStore.getState().close();

    const raw = localStorage.getItem("deera-catalog-visit-us");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.state.lastShownDate).toBe(todayStr());
    expect(parsed.state.open).toBeUndefined();
  });
});
