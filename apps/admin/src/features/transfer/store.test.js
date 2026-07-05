import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransferDraftStore } from "./store";

const EMPTY = {
  fromLoc: undefined, toLoc: undefined, notes: undefined,
  selected: undefined, useCustomToLoc: undefined, customToLocText: undefined,
};

beforeEach(() => {
  useTransferDraftStore.setState({ ...EMPTY });
});

describe("useTransferDraftStore", () => {
  it("state awal semua field undefined", () => {
    const { result } = renderHook(() => useTransferDraftStore((s) => s));
    expect(result.current.fromLoc).toBeUndefined();
    expect(result.current.toLoc).toBeUndefined();
    expect(result.current.selected).toBeUndefined();
  });

  it("save: menyimpan draft baru (partial)", () => {
    const { result } = renderHook(() => useTransferDraftStore((s) => s));

    act(() => { result.current.save({ fromLoc: "gudang", toLoc: "cideng", selected: [{ kode: "D-01" }] }); });

    expect(result.current.fromLoc).toBe("gudang");
    expect(result.current.toLoc).toBe("cideng");
    expect(result.current.selected).toEqual([{ kode: "D-01" }]);
  });

  it("clear: mereset semua field ke undefined", () => {
    const { result } = renderHook(() => useTransferDraftStore((s) => s));

    act(() => { result.current.save({ fromLoc: "gudang", notes: "Test" }); });
    act(() => { result.current.clear(); });

    expect(result.current.fromLoc).toBeUndefined();
    expect(result.current.notes).toBeUndefined();
  });

  it("getState() mengembalikan state terkini tanpa render", () => {
    useTransferDraftStore.setState({ fromLoc: "tegalgubug" });
    expect(useTransferDraftStore.getState().fromLoc).toBe("tegalgubug");
  });
});
