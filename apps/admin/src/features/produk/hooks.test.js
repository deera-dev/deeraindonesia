import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const useStokMapQuery = vi.fn();
const useStokWarnaByKodeQuery = vi.fn();
const useSaveProductMutation = vi.fn();
const useDeleteProductCascadeMutation = vi.fn();
vi.mock("./queries", () => ({
  useStokMapQuery: (...args) => useStokMapQuery(...args),
  useStokWarnaByKodeQuery: (...args) => useStokWarnaByKodeQuery(...args),
  useSaveProductMutation: (...args) => useSaveProductMutation(...args),
  useDeleteProductCascadeMutation: (...args) => useDeleteProductCascadeMutation(...args),
}));

const {
  useStokMap,
  useStokWarnaByKode,
  useSaveProduct,
  useDeleteProductCascade,
  usePushNotification,
} = await import("./hooks");

beforeEach(() => {
  useStokMapQuery.mockReset();
  useStokWarnaByKodeQuery.mockReset();
  useSaveProductMutation.mockReset();
  useDeleteProductCascadeMutation.mockReset();
});

describe("useStokMap", () => {
  it("mengembalikan stokMap dari data & reload dari refetch", () => {
    const refetch = vi.fn();
    const data = { A: { gudang: 1 } };
    useStokMapQuery.mockReturnValue({ data, refetch });

    const { result } = renderHook(() => useStokMap());

    expect(result.current.stokMap).toBe(data);
    expect(result.current.reload).toBe(refetch);
  });

  it("fallback stokMap ke {} saat data undefined", () => {
    useStokMapQuery.mockReturnValue({ data: undefined, refetch: vi.fn() });

    const { result } = renderHook(() => useStokMap());

    expect(result.current.stokMap).toEqual({});
  });
});

describe("useStokWarnaByKode", () => {
  it("meneruskan kode & options ke query, mengembalikan stokWarnaMap & loading", () => {
    const data = { Midi: { HITAM: {} } };
    useStokWarnaByKodeQuery.mockReturnValue({ data, isLoading: false });

    const { result } = renderHook(() => useStokWarnaByKode("D-01-OSK", { enabled: true }));

    expect(useStokWarnaByKodeQuery).toHaveBeenCalledWith("D-01-OSK", { enabled: true });
    expect(result.current.stokWarnaMap).toBe(data);
    expect(result.current.loading).toBe(false);
  });

  it("fallback stokWarnaMap ke {} saat data undefined", () => {
    useStokWarnaByKodeQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useStokWarnaByKode(undefined));

    expect(result.current.stokWarnaMap).toEqual({});
    expect(result.current.loading).toBe(true);
  });
});

describe("useSaveProduct", () => {
  it("mengembalikan fungsi yang memanggil mutateAsync dengan payload", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ kode: "D-01-OSK" });
    useSaveProductMutation.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useSaveProduct());
    const payload = { isEdit: false };
    await result.current(payload);

    expect(mutateAsync).toHaveBeenCalledWith(payload);
  });
});

describe("useDeleteProductCascade", () => {
  it("mengembalikan fungsi yang memanggil mutateAsync dengan kode", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useDeleteProductCascadeMutation.mockReturnValue({ mutateAsync });

    const { result } = renderHook(() => useDeleteProductCascade());
    await result.current("D-99-OSK");

    expect(mutateAsync).toHaveBeenCalledWith("D-99-OSK");
  });
});

describe("re-export usePushNotification", () => {
  it("mengekspor usePushNotification sebagai fungsi", () => {
    expect(usePushNotification).toBeTypeOf("function");
  });
});
