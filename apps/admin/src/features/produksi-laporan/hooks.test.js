import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useProduksiBatchesQuery: vi.fn().mockReturnValue({ data: [{ id: "b1" }], isLoading: false }),
  useTagihanJatuhTempoQuery: vi.fn().mockReturnValue({ data: [{ id: "t1" }], isLoading: false }),
}));

import { useProduksiBatches, useTagihanJatuhTempo } from "./hooks";
import { useProduksiBatchesQuery, useTagihanJatuhTempoQuery } from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("useProduksiBatches", () => {
  it("returns batches and loading=false", () => {
    useProduksiBatchesQuery.mockReturnValue({ data: [{ id: "b1" }], isLoading: false });
    const { result } = renderHook(() => useProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.batches).toEqual([{ id: "b1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useProduksiBatchesQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.batches).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useTagihanJatuhTempo", () => {
  it("returns tagihan and loading=false", () => {
    useTagihanJatuhTempoQuery.mockReturnValue({ data: [{ id: "t1" }], isLoading: false });
    const { result } = renderHook(() => useTagihanJatuhTempo({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.tagihan).toEqual([{ id: "t1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useTagihanJatuhTempoQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useTagihanJatuhTempo({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.tagihan).toEqual([]);
  });
});
