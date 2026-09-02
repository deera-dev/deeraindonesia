import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";

const fetchHistoryMock = vi.fn();
const fetchHistoryByKodeMock = vi.fn();
const deleteHistoryEntryMock = vi.fn();
vi.mock("./api", () => ({
  fetchHistory: (...a) => fetchHistoryMock(...a),
  fetchHistoryByKode: (...a) => fetchHistoryByKodeMock(...a),
  deleteHistoryEntry: (...a) => deleteHistoryEntryMock(...a),
}));

const { historyKeys, useHistoryQuery, useHistoryByKodeQuery, useDeleteHistoryMutation } = await import("./queries");

beforeEach(() => {
  fetchHistoryMock.mockReset();
  fetchHistoryByKodeMock.mockReset();
  deleteHistoryEntryMock.mockReset();
});

describe("useHistoryQuery", () => {
  it("memanggil fetchHistory dan mengembalikan data", async () => {
    const rows = [{ id: "1", action: "tambah" }];
    fetchHistoryMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () => useHistoryQuery({ dateFrom: "2026-06-01", dateTo: "2026-06-30", category: "produk" }),
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchHistoryMock).toHaveBeenCalledWith({ dateFrom: "2026-06-01", dateTo: "2026-06-30", category: "produk" });
    expect(result.current.data).toBe(rows);
  });

  it("query key mencakup dateFrom/dateTo/category", () => {
    const key = historyKeys.list("2026-01-01", "2026-01-31", "stok");
    expect(key).toEqual(["history", "2026-01-01", "2026-01-31", "stok"]);
  });
});

describe("useHistoryByKodeQuery", () => {
  it("memanggil fetchHistoryByKode dengan kode dan mengembalikan data", async () => {
    const rows = [{ id: "1", kode: "SPL-20260901-001" }];
    fetchHistoryByKodeMock.mockResolvedValue(rows);

    const { result } = renderHook(() => useHistoryByKodeQuery("SPL-20260901-001"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchHistoryByKodeMock).toHaveBeenCalledWith("SPL-20260901-001");
    expect(result.current.data).toBe(rows);
  });

  it("tidak memanggil fetchHistoryByKode saat kode falsy (query disabled)", () => {
    const { result } = renderHook(() => useHistoryByKodeQuery(null), {
      wrapper: createQueryWrapper(),
    });

    expect(fetchHistoryByKodeMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("query key mencakup kode", () => {
    expect(historyKeys.byKode("SPL-1")).toEqual(["history", "byKode", "SPL-1"]);
  });
});

describe("useDeleteHistoryMutation", () => {
  it("memanggil deleteHistoryEntry & invalidateQueries saat sukses", async () => {
    deleteHistoryEntryMock.mockResolvedValue(undefined);
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteHistoryMutation(), {
      wrapper: createQueryWrapper(qc),
    });

    await act(async () => { await result.current.mutateAsync("abc-123"); });

    expect(deleteHistoryEntryMock).toHaveBeenCalledWith("abc-123");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: historyKeys.all });
  });
});
