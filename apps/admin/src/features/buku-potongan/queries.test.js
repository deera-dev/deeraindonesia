import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";

const fetchBukuPotonganDataMock = vi.fn();
const upsertExpectedStokMock = vi.fn();
vi.mock("./api", () => ({
  fetchBukuPotonganData: (...a) => fetchBukuPotonganDataMock(...a),
  upsertExpectedStok: (...a) => upsertExpectedStokMock(...a),
}));

const { bukuPotonganKeys, useBukuPotonganDataQuery, useUpsertExpectedStokMutation } = await import("./queries");

beforeEach(() => {
  fetchBukuPotonganDataMock.mockReset();
  upsertExpectedStokMock.mockReset();
});

describe("useBukuPotonganDataQuery", () => {
  it("memanggil fetchBukuPotonganData dan mengembalikan data", async () => {
    const data = { stokRows: [], expectedRows: [], tableError: false };
    fetchBukuPotonganDataMock.mockResolvedValue(data);

    const { result } = renderHook(() => useBukuPotonganDataQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});

describe("useUpsertExpectedStokMutation", () => {
  it("memanggil upsertExpectedStok & invalidateQueries saat sukses", async () => {
    const rows = [{ kode: "D-01", size: "Midi", warna: "_", expected_qty: 5 }];
    upsertExpectedStokMock.mockResolvedValue(rows);
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpsertExpectedStokMutation(), { wrapper: createQueryWrapper(qc) });

    await act(async () => { await result.current.mutateAsync(rows); });

    expect(upsertExpectedStokMock).toHaveBeenCalledWith(rows);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: bukuPotonganKeys.all });
  });
});
