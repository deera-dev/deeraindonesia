import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStokOpnameDraftStore } from "./store";

const useStokWarnaAllQueryMock = vi.fn();
const useSaveStokOpnameMutationMock = vi.fn();
vi.mock("./queries", () => ({
  useStokWarnaAllQuery: (...a) => useStokWarnaAllQueryMock(...a),
  useSaveStokOpnameMutation: (...a) => useSaveStokOpnameMutationMock(...a),
}));

const { useStokWarnaAll, useSaveStokOpname, useStokOpnameDraft, hasPersistedDraft } = await import("./hooks");

beforeEach(() => {
  useStokWarnaAllQueryMock.mockReset();
  useSaveStokOpnameMutationMock.mockReset();
  useStokOpnameDraftStore.setState({ changed: {} });
});

describe("useStokWarnaAll", () => {
  it("mengembalikan stokRows & loading dari query", () => {
    const rows = [{ id: "1" }];
    useStokWarnaAllQueryMock.mockReturnValue({ data: rows, isLoading: false });

    const { result } = renderHook(() => useStokWarnaAll());

    expect(result.current.stokRows).toBe(rows);
    expect(result.current.loading).toBe(false);
  });

  it("fallback stokRows ke [] saat data undefined", () => {
    useStokWarnaAllQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useStokWarnaAll());
    expect(result.current.stokRows).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useSaveStokOpname", () => {
  it("mengembalikan fungsi yang memanggil mutateAsync", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ count: 2 });
    useSaveStokOpnameMutationMock.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useSaveStokOpname());
    const res = await result.current({ changed: {}, stokRows: [], products: [] });

    expect(mutateAsync).toHaveBeenCalled();
    expect(res).toEqual({ count: 2 });
  });
});

describe("useStokOpnameDraft", () => {
  it("mengembalikan changed, setValue, clear dari Zustand store", () => {
    const { result } = renderHook(() => useStokOpnameDraft());

    expect(result.current.changed).toEqual({});
    act(() => { result.current.setValue("r1", "gudang", "7"); });
    expect(result.current.changed).toEqual({ r1: { gudang: 7 } });

    act(() => { result.current.clear(); });
    expect(result.current.changed).toEqual({});
  });
});

describe("hasPersistedDraft", () => {
  it("mengembalikan false saat changed kosong", () => {
    useStokOpnameDraftStore.setState({ changed: {} });
    expect(hasPersistedDraft()).toBe(false);
  });

  it("mengembalikan true saat ada entri di changed", () => {
    useStokOpnameDraftStore.setState({ changed: { r1: { gudang: 5 } } });
    expect(hasPersistedDraft()).toBe(true);
  });
});
