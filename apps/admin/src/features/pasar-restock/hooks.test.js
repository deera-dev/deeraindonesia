import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./queries", () => ({ usePasarRestockQuery: vi.fn() }));

import { usePasarRestock } from "./hooks";
import { usePasarRestockQuery } from "./queries";

describe("usePasarRestock", () => {
  it("memetakan hasil RPC ke daftar restock & tidak bergerak", () => {
    usePasarRestockQuery.mockReturnValue({
      data: { restock: [{ kode: "A" }], tidak_bergerak: [{ kode: "B" }] },
      isLoading: false,
    });
    const { result } = renderHook(() => usePasarRestock("cideng"));
    expect(result.current.restockList).toEqual([{ kode: "A" }]);
    expect(result.current.tidakBergerakList).toEqual([{ kode: "B" }]);
    expect(result.current.loading).toBe(false);
  });
  it("default kosong saat loading", () => {
    usePasarRestockQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => usePasarRestock("cideng"));
    expect(result.current.restockList).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
