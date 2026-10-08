import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStokOpnameSessionStore } from "./store";

const useStokWarnaAllQueryMock = vi.fn();
const useSaveStokOpnameMutationMock = vi.fn();
const useJahitDikerjakanQueryMock = vi.fn();
vi.mock("./queries", () => ({
  useStokWarnaAllQuery: (...a) => useStokWarnaAllQueryMock(...a),
  useSaveStokOpnameMutation: (...a) => useSaveStokOpnameMutationMock(...a),
  useJahitDikerjakanQuery: (...a) => useJahitDikerjakanQueryMock(...a),
}));

const useBukuMock = vi.fn();
vi.mock("../buku-potongan/hooks", () => ({ useBukuPotonganData: (...a) => useBukuMock(...a) }));

const { useBukuPotonganInfo, useStokWarnaAll, useSaveStokOpname, useJahitDikerjakan, useStokOpnameSession } = await import("./hooks");

beforeEach(() => {
  useStokWarnaAllQueryMock.mockReset();
  useSaveStokOpnameMutationMock.mockReset();
  useJahitDikerjakanQueryMock.mockReset();
  useStokOpnameSessionStore.setState({ loc: null, counted: {}, guideDismissed: false });
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

describe("useJahitDikerjakan", () => {
  it("mengembalikan rows & loading dari query", () => {
    const rows = [{ kode: "D-01-OSK", size: "Midi", total_dikerjakan: 12 }];
    useJahitDikerjakanQueryMock.mockReturnValue({ data: rows, isLoading: false });

    const { result } = renderHook(() => useJahitDikerjakan());

    expect(result.current.rows).toBe(rows);
    expect(result.current.loading).toBe(false);
  });

  it("fallback rows ke [] saat data undefined", () => {
    useJahitDikerjakanQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useJahitDikerjakan());
    expect(result.current.rows).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useBukuPotonganInfo", () => {
  it("menggabungkan expected & terjual jadi peta seharusnya", () => {
    useBukuMock.mockReturnValue({
      expectedRows: [{ kode: "K", size: "Midi", warna: "HITAM", expected_qty: 10 }],
      soldMap: { K: { Midi: { HITAM: 4 } } },
    });
    const { result } = renderHook(() => useBukuPotonganInfo());
    expect(result.current.K__Midi__HITAM.seharusnya).toBe(6);
  });
});

describe("useStokOpnameSession", () => {
  it("lokasi, penanda sudah dihitung, panduan", () => {
    const { result } = renderHook(() => useStokOpnameSession());
    expect(result.current.loc).toBeNull();
    act(() => result.current.setLoc("cideng"));
    expect(result.current.loc).toBe("cideng");

    act(() => result.current.markCounted("cideng", "D-01", -2));
    expect(result.current.counted.cideng["D-01"].selisih).toBe(-2);
    expect(result.current.counted.gudang).toBeUndefined();

    act(() => result.current.resetCounted("cideng"));
    expect(result.current.counted.cideng).toEqual({});

    act(() => result.current.dismissGuide());
    expect(result.current.guideDismissed).toBe(true);
    act(() => result.current.showGuide());
    expect(result.current.guideDismissed).toBe(false);
  });
});
