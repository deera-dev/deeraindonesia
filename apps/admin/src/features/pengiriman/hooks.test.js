import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mencegah real lib/supabase.js (dipanggil transitif lewat ./api saat
// hooks.js melakukan `export { generatePengirimanNo } from "./api"`) dari
// benar-benar membuat client Supabase nyata saat import-time.
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: {} }));

const pengirimanQueryState = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
const createMutation = { mutateAsync: vi.fn() };
const updateMutation = { mutateAsync: vi.fn() };
const deleteMutation = { mutateAsync: vi.fn() };

vi.mock("./queries", () => ({
  usePengirimanQuery: () => pengirimanQueryState,
  useCreatePengirimanMutation: () => createMutation,
  useUpdatePengirimanMutation: () => updateMutation,
  useDeletePengirimanMutation: () => deleteMutation,
}));

const { usePengiriman, useCreatePengiriman, useUpdatePengiriman, useDeletePengiriman, generatePengirimanNo } =
  await import("./hooks");

beforeEach(() => {
  pengirimanQueryState.data = undefined;
  pengirimanQueryState.isLoading = false;
  pengirimanQueryState.error = null;
  createMutation.mutateAsync.mockReset();
  updateMutation.mutateAsync.mockReset();
  deleteMutation.mutateAsync.mockReset();
});

describe("usePengiriman", () => {
  it("fallback ke array kosong saat data undefined", () => {
    const { result } = renderHook(() => usePengiriman());
    expect(result.current.pengirimanList).toEqual([]);
    expect(result.current.reload).toBe(pengirimanQueryState.refetch);
  });

  it("mengembalikan data pengiriman saat tersedia", () => {
    pengirimanQueryState.data = [{ id: "pg1" }];
    pengirimanQueryState.isLoading = true;
    const { result } = renderHook(() => usePengiriman("2026-08-01", "2026-08-31"));
    expect(result.current.pengirimanList).toEqual([{ id: "pg1" }]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useCreatePengiriman", () => {
  it("memanggil mutateAsync dengan payload yang sama", async () => {
    const { result } = renderHook(() => useCreatePengiriman());
    const payload = { tanggal: "2026-08-24", namaPenerima: "Budi" };

    await result.current(payload);

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(payload);
  });
});

describe("useUpdatePengiriman", () => {
  it("memanggil mutateAsync dengan pengiriman & payload", async () => {
    const { result } = renderHook(() => useUpdatePengiriman());
    const pengiriman = { id: "pg1" };
    const payload = { namaPenerima: "Budi Update" };

    await result.current(pengiriman, payload);

    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({ pengiriman, payload });
  });
});

describe("useDeletePengiriman", () => {
  it("memanggil mutateAsync dengan pengiriman", async () => {
    const { result } = renderHook(() => useDeletePengiriman());
    const pengiriman = { id: "pg1" };

    await result.current(pengiriman);

    expect(deleteMutation.mutateAsync).toHaveBeenCalledWith(pengiriman);
  });
});

describe("generatePengirimanNo (re-export dari ./api)", () => {
  it("menghasilkan format KRM-YYYYMMDD-xxx", () => {
    expect(generatePengirimanNo()).toMatch(/^KRM-\d{8}-\d{3}$/);
  });
});
