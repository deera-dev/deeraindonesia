import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";

const fetchAllStokWarnaMock = vi.fn();
const saveStokOpnameMock = vi.fn();
const fetchJahitDikerjakanMock = vi.fn();
vi.mock("./api", () => ({
  fetchAllStokWarna: (...a) => fetchAllStokWarnaMock(...a),
  saveStokOpname: (...a) => saveStokOpnameMock(...a),
  fetchJahitDikerjakan: (...a) => fetchJahitDikerjakanMock(...a),
}));

const { stokOpnameKeys, useStokWarnaAllQuery, useSaveStokOpnameMutation, useJahitDikerjakanQuery } = await import("./queries");

beforeEach(() => {
  fetchAllStokWarnaMock.mockReset();
  saveStokOpnameMock.mockReset();
  fetchJahitDikerjakanMock.mockReset();
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

describe("useJahitDikerjakanQuery", () => {
  it("memanggil fetchJahitDikerjakan dan mengembalikan data", async () => {
    const rows = [{ kode: "D-01-OSK", size: "Midi", total_dikerjakan: 12 }];
    fetchJahitDikerjakanMock.mockResolvedValue(rows);

    const { result } = renderHook(() => useJahitDikerjakanQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(rows);
  });

  it("menggunakan query key stokOpnameKeys.jahitDikerjakan", () => {
    expect(stokOpnameKeys.jahitDikerjakan).toEqual(["stok-opname", "jahit-dikerjakan"]);
  });
});
