import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const useBukuPotonganDataQueryMock = vi.fn();
const useUpsertExpectedStokMutationMock = vi.fn();
vi.mock("./queries", () => ({
  useBukuPotonganDataQuery: (...a) => useBukuPotonganDataQueryMock(...a),
  useUpsertExpectedStokMutation: (...a) => useUpsertExpectedStokMutationMock(...a),
}));

const { useBukuPotonganData, useSaveExpectedStok } = await import("./hooks");

beforeEach(() => {
  useBukuPotonganDataQueryMock.mockReset();
  useUpsertExpectedStokMutationMock.mockReset();
});

describe("useBukuPotonganData", () => {
  it("mengembalikan stokRows, expectedRows, tableError, loading dari query", () => {
    const stokRows = [{ id: "1" }];
    const expRows = [{ id: "2" }];
    const refetch = vi.fn();
    useBukuPotonganDataQueryMock.mockReturnValue({
      data: { stokRows, expectedRows: expRows, tableError: false },
      isLoading: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useBukuPotonganData());

    expect(result.current.stokRows).toBe(stokRows);
    expect(result.current.expectedRows).toBe(expRows);
    expect(result.current.tableError).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.reload).toBe(refetch);
  });

  it("fallback ke [] / false saat data undefined", () => {
    useBukuPotonganDataQueryMock.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });

    const { result } = renderHook(() => useBukuPotonganData());

    expect(result.current.stokRows).toEqual([]);
    expect(result.current.expectedRows).toEqual([]);
    expect(result.current.tableError).toBe(false);
    expect(result.current.loading).toBe(true);
  });
});

describe("useSaveExpectedStok", () => {
  it("mengembalikan saveExpectedStok & saving dari mutation", async () => {
    const mutateAsync = vi.fn().mockResolvedValue([{ kode: "D-01" }]);
    useUpsertExpectedStokMutationMock.mockReturnValue({ mutateAsync, isPending: false });

    const { result } = renderHook(() => useSaveExpectedStok());

    expect(result.current.saving).toBe(false);
    const rows = [{ kode: "D-01", size: "Midi", warna: "_", expected_qty: 5 }];
    await result.current.saveExpectedStok(rows);
    expect(mutateAsync).toHaveBeenCalledWith(rows);
  });
});
