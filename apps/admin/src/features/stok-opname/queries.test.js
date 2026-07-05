import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";

const fetchAllStokWarnaMock = vi.fn();
const saveStokOpnameMock = vi.fn();
vi.mock("./api", () => ({
  fetchAllStokWarna: (...a) => fetchAllStokWarnaMock(...a),
  saveStokOpname: (...a) => saveStokOpnameMock(...a),
}));

const { stokOpnameKeys, useStokWarnaAllQuery, useSaveStokOpnameMutation } = await import("./queries");

beforeEach(() => {
  fetchAllStokWarnaMock.mockReset();
  saveStokOpnameMock.mockReset();
});

describe("useStokWarnaAllQuery", () => {
  it("memanggil fetchAllStokWarna dan mengembalikan data", async () => {
    const rows = [{ id: "1", kode: "D-01" }];
    fetchAllStokWarnaMock.mockResolvedValue(rows);

    const { result } = renderHook(() => useStokWarnaAllQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(rows);
  });
});

describe("useSaveStokOpnameMutation", () => {
  it("memanggil saveStokOpname & invalidateQueries saat sukses", async () => {
    saveStokOpnameMock.mockResolvedValue({ count: 3 });
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useSaveStokOpnameMutation(), { wrapper: createQueryWrapper(qc) });

    await act(async () => { await result.current.mutateAsync({ changed: {}, stokRows: [], products: [] }); });

    expect(saveStokOpnameMock).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: stokOpnameKeys.all });
  });
});
