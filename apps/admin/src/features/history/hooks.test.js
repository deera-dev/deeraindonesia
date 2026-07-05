import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";

const useHistoryQueryMock = vi.fn();
const useDeleteHistoryMutationMock = vi.fn();
vi.mock("./queries", () => ({
  useHistoryQuery: (...a) => useHistoryQueryMock(...a),
  useDeleteHistoryMutation: (...a) => useDeleteHistoryMutationMock(...a),
}));

const logHistoryApiMock = vi.fn();
vi.mock("./api", () => ({
  logHistory: (...a) => logHistoryApiMock(...a),
}));

const { logHistory, useHistory, useDeleteHistory } = await import("./hooks");

beforeEach(() => {
  useHistoryQueryMock.mockReset();
  useDeleteHistoryMutationMock.mockReset();
  logHistoryApiMock.mockReset();
});

describe("logHistory re-export", () => {
  it("memanggil logHistory dari api.js", async () => {
    logHistoryApiMock.mockResolvedValue(undefined);
    await logHistory({ action: "tambah", kode: "D-01" });
    expect(logHistoryApiMock).toHaveBeenCalledWith({ action: "tambah", kode: "D-01" });
  });
});

describe("useHistory", () => {
  it("mengembalikan history, loading, error, reload dari query", () => {
    const refetch = vi.fn();
    const rows = [{ id: "1" }];
    useHistoryQueryMock.mockReturnValue({ data: rows, isLoading: false, error: null, refetch });

    const { result } = renderHook(() => useHistory({ dateFrom: null, dateTo: null, category: "all" }));

    expect(useHistoryQueryMock).toHaveBeenCalledWith({ dateFrom: null, dateTo: null, category: "all" });
    expect(result.current.history).toBe(rows);
    expect(result.current.loading).toBe(false);
    expect(result.current.reload).toBe(refetch);
  });

  it("fallback history ke [] saat data undefined", () => {
    useHistoryQueryMock.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });

    const { result } = renderHook(() => useHistory());

    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useDeleteHistory", () => {
  it("mengembalikan fungsi yang memanggil mutateAsync", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useDeleteHistoryMutationMock.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useDeleteHistory());
    await result.current("abc-123");

    expect(mutateAsync).toHaveBeenCalledWith("abc-123");
  });
});
