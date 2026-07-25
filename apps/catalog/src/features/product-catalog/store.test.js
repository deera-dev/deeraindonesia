import { describe, it, expect, beforeEach } from "vitest";
import { useVisitUsModalStore, useCatalogSearchStore, useCatalogFilterStore } from "./store";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

beforeEach(() => {
  localStorage.clear();
  useVisitUsModalStore.setState({ lastShownDate: null, open: false });
  useCatalogSearchStore.setState({ open: false, query: "" });
  useCatalogFilterStore.setState({ open: false, bahan: null, ukuran: null });
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


describe("useCatalogSearchStore", () => {
  it("show() membuka modal pencarian", () => {
    useCatalogSearchStore.getState().show();
    expect(useCatalogSearchStore.getState().open).toBe(true);
  });

  it("setQuery() mengubah query", () => {
    useCatalogSearchStore.getState().setQuery("gamis dewi");
    expect(useCatalogSearchStore.getState().query).toBe("gamis dewi");
  });

  it("close() menutup modal DAN mereset query", () => {
    useCatalogSearchStore.getState().show();
    useCatalogSearchStore.getState().setQuery("gamis dewi");
    useCatalogSearchStore.getState().close();
    const state = useCatalogSearchStore.getState();
    expect(state.open).toBe(false);
    expect(state.query).toBe("");
  });
});


describe("useCatalogFilterStore", () => {
  it("show() membuka modal filter", () => {
    useCatalogFilterStore.getState().show();
    expect(useCatalogFilterStore.getState().open).toBe(true);
  });

  it("close() menutup modal TANPA mereset bahan/ukuran", () => {
    useCatalogFilterStore.setState({ open: true, bahan: "Ceruti" });
    useCatalogFilterStore.getState().close();
    const state = useCatalogFilterStore.getState();
    expect(state.open).toBe(false);
    expect(state.bahan).toBe("Ceruti");
  });

  it("setBahan() memilih bahan baru", () => {
    useCatalogFilterStore.getState().setBahan("Ceruti");
    expect(useCatalogFilterStore.getState().bahan).toBe("Ceruti");
  });

  it("setBahan() dengan bahan yang sama men-toggle (deselect)", () => {
    useCatalogFilterStore.setState({ bahan: "Ceruti" });
    useCatalogFilterStore.getState().setBahan("Ceruti");
    expect(useCatalogFilterStore.getState().bahan).toBeNull();
  });

  it("setUkuran() memilih ukuran baru & toggle deselect", () => {
    useCatalogFilterStore.getState().setUkuran("Midi");
    expect(useCatalogFilterStore.getState().ukuran).toBe("Midi");
    useCatalogFilterStore.getState().setUkuran("Midi");
    expect(useCatalogFilterStore.getState().ukuran).toBeNull();
  });

  it("reset() mengosongkan bahan & ukuran", () => {
    useCatalogFilterStore.setState({ bahan: "Ceruti", ukuran: "Midi" });
    useCatalogFilterStore.getState().reset();
    const state = useCatalogFilterStore.getState();
    expect(state.bahan).toBeNull();
    expect(state.ukuran).toBeNull();
  });
});
