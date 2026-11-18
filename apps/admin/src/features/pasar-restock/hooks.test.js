import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("./queries", () => ({ usePasarRestockQuery: vi.fn() }));
vi.mock("@deera/shared/features/transfers/hooks", () => ({ useCreateTransfer: vi.fn() }));
import { usePasarRestock, useTargetSeriQty } from "./hooks";
import { usePasarRestockQuery } from "./queries";
import { useTargetSeriStore } from "./store";
import { DEFAULT_TARGET_SERI } from "./utils";

beforeEach(() => {
  useTargetSeriStore.setState({ targetByMarket: { ...DEFAULT_TARGET_SERI } });
});

describe("usePasarRestock", () => {
  it("memetakan hasil RPC ke daftar restock & tidak bergerak", () => {
    usePasarRestockQuery.mockReturnValue({ data: { restock: [{ kode: "A" }], tidak_bergerak: [{ kode: "B" }] }, isLoading: false });
    const { result } = renderHook(() => usePasarRestock("cideng", 2));
    expect(usePasarRestockQuery).toHaveBeenCalledWith("cideng", 2);
    expect(result.current.restockList).toEqual([{ kode: "A" }]);
    expect(result.current.tidakBergerakList).toEqual([{ kode: "B" }]);
    expect(result.current.loading).toBe(false);
  });
  it("default kosong saat loading", () => {
    usePasarRestockQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => usePasarRestock("cideng", 2));
    expect(result.current.restockList).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useTargetSeriQty", () => {
  it("default cideng=2, tegalgubug=3 (admin: minimal seri per pasar beda)", () => {
    const cideng = renderHook(() => useTargetSeriQty("cideng"));
    const tegalgubug = renderHook(() => useTargetSeriQty("tegalgubug"));
    expect(cideng.result.current.target).toBe(2);
    expect(tegalgubug.result.current.target).toBe(3);
  });

  it("setTarget mengubah nilai & tersimpan per pasar (tetap bisa diedit)", () => {
    const { result } = renderHook(() => useTargetSeriQty("cideng"));
    act(() => result.current.setTarget(5));
    expect(result.current.target).toBe(5);
    // Tegalgubug tidak ikut berubah — target per-market independen.
    const { result: tegal } = renderHook(() => useTargetSeriQty("tegalgubug"));
    expect(tegal.current.target).toBe(3);
  });
});
