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

// produkKeys cuma object konstanta polos (query key), aman di-mock minimal
// di sini supaya tidak ikut narik api.js fitur produk (Supabase, dkk).
vi.mock("../produk/queries", () => ({
  produkKeys: { stokMap: ["produk", "stok-map"] },
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

  // BUG FIX (November 2026) — laporan admin: angka ringkasan "Stok &
  // Penjualan" di ProductDetailModal (dari cache fitur produk) masih
  // nampilin angka LAMA setelah Stok Opname disimpan, walau "Stok per
  // Warna" (query lain, selalu fresh) sudah benar. stok_warna adalah
  // tabel yang sama — simpan opname wajib ikut invalidate cache fitur
  // produk juga, bukan cuma cache fitur stok-opname sendiri.
  it("juga invalidate cache fitur produk (stokMap & stok-warna per kode) — bukan cuma cache stok-opname sendiri", async () => {
    saveStokOpnameMock.mockResolvedValue({ count: 3 });
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useSaveStokOpnameMutation(), { wrapper: createQueryWrapper(qc) });

    await act(async () => { await result.current.mutateAsync({ changed: {}, stokRows: [], products: [] }); });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["produk", "stok-map"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["produk", "stok-warna"] });
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
