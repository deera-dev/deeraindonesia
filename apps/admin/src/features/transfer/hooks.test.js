import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransferDraftStore } from "./store";
import { readTransferDraft, useTransferDraftActions } from "./hooks";

const EMPTY = {
  fromLoc: undefined, toLoc: undefined, notes: undefined,
  selected: undefined, useCustomToLoc: undefined, customToLocText: undefined,
};

beforeEach(() => {
  useTransferDraftStore.setState({ ...EMPTY });
});

describe("readTransferDraft", () => {
  it("mengembalikan snapshot state terkini tanpa hook", () => {
    useTransferDraftStore.setState({ fromLoc: "gudang", selected: [{ kode: "D-01" }] });

    const draft = readTransferDraft();

    expect(draft.fromLoc).toBe("gudang");
    expect(draft.selected).toEqual([{ kode: "D-01" }]);
  });

  it("mengembalikan field EMPTY saat store kosong", () => {
    const draft = readTransferDraft();
    expect(draft.fromLoc).toBeUndefined();
    expect(draft.selected).toBeUndefined();
  });
});

describe("useTransferDraftActions", () => {
  it("saveDraft menyimpan ke store", () => {
    const { result } = renderHook(() => useTransferDraftActions());

    act(() => { result.current.saveDraft({ fromLoc: "cideng", notes: "pindah" }); });

    expect(useTransferDraftStore.getState().fromLoc).toBe("cideng");
    expect(useTransferDraftStore.getState().notes).toBe("pindah");
  });

  it("clearDraft menghapus semua field", () => {
    useTransferDraftStore.setState({ fromLoc: "gudang", notes: "test" });
    const { result } = renderHook(() => useTransferDraftActions());

    act(() => { result.current.clearDraft(); });

    expect(useTransferDraftStore.getState().fromLoc).toBeUndefined();
    expect(useTransferDraftStore.getState().notes).toBeUndefined();
  });
});
