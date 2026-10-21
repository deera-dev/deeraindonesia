import { describe, it, expect, beforeEach } from "vitest";
import { usePetaFilterStore } from "./store";

beforeEach(() => {
  usePetaFilterStore.setState({ daerah: "", approach: "", search: "", sheetTab: "rencana" });
});

describe("usePetaFilterStore", () => {
  it("setFilter menggabungkan patch", () => {
    usePetaFilterStore.getState().setFilter({ daerah: "CIREBON" });
    usePetaFilterStore.getState().setFilter({ approach: "belum" });
    expect(usePetaFilterStore.getState()).toMatchObject({ daerah: "CIREBON", approach: "belum", search: "" });
  });

  it("resetFilter mengosongkan filter tapi mempertahankan tab sheet", () => {
    usePetaFilterStore.setState({ daerah: "X", approach: "sudah", search: "abc", sheetTab: "semua" });
    usePetaFilterStore.getState().resetFilter();
    expect(usePetaFilterStore.getState()).toMatchObject({ daerah: "", approach: "", search: "", sheetTab: "semua" });
  });
});
