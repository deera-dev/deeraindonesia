import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";

const fetchStokMap = vi.fn();
const fetchStokWarnaByKode = vi.fn();
const saveProduct = vi.fn();
const deleteProductCascade = vi.fn();
vi.mock("./api", () => ({
  fetchStokMap: (...args) => fetchStokMap(...args),
  fetchStokWarnaByKode: (...args) => fetchStokWarnaByKode(...args),
  saveProduct: (...args) => saveProduct(...args),
  deleteProductCascade: (...args) => deleteProductCascade(...args),
}));

const invalidateProductsMock = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({
  useInvalidateProducts: () => invalidateProductsMock,
}));

const {
  produkKeys,
  useStokMapQuery,
  useStokWarnaByKodeQuery,
  useSaveProductMutation,
  useDeleteProductCascadeMutation,
} = await import("./queries");

beforeEach(() => {
  fetchStokMap.mockReset();
  fetchStokWarnaByKode.mockReset();
  saveProduct.mockReset();
  deleteProductCascade.mockReset();
  invalidateProductsMock.mockReset();
});

describe("useStokMapQuery", () => {
  it("memanggil fetchStokMap dan mengembalikan data", async () => {
    const data = { "D-01-OSK": { gudang: 1 } };
    fetchStokMap.mockResolvedValue(data);

    const { result } = renderHook(() => useStokMapQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
    expect(fetchStokMap).toHaveBeenCalled();
  });
});

describe("useStokWarnaByKodeQuery", () => {
  it("memanggil fetchStokWarnaByKode dengan kode saat enabled & kode tersedia", async () => {
    const data = { Midi: { HITAM: {} } };
    fetchStokWarnaByKode.mockResolvedValue(data);

    const { result } = renderHook(() => useStokWarnaByKodeQuery("D-01-OSK"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchStokWarnaByKode).toHaveBeenCalledWith("D-01-OSK");
    expect(result.current.data).toBe(data);
  });

  it("tidak fetch saat kode falsy", () => {
    const { result } = renderHook(() => useStokWarnaByKodeQuery(undefined), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchStokWarnaByKode).not.toHaveBeenCalled();
  });

  it("tidak fetch saat options.enabled=false meski kode tersedia", () => {
    const { result } = renderHook(() => useStokWarnaByKodeQuery("D-01-OSK", { enabled: false }), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchStokWarnaByKode).not.toHaveBeenCalled();
  });
});

describe("useSaveProductMutation", () => {
  it("memanggil saveProduct, invalidateProducts(), & invalidateQueries stokMap saat sukses", async () => {
    saveProduct.mockResolvedValue({ kode: "D-01-OSK" });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSaveProductMutation(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ isEdit: false });
    });

    expect(saveProduct).toHaveBeenCalledWith({ isEdit: false });
    expect(invalidateProductsMock).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produkKeys.stokMap });
  });
});

describe("useDeleteProductCascadeMutation", () => {
  it("memanggil deleteProductCascade, invalidateProducts(), & invalidateQueries stokMap saat sukses", async () => {
    deleteProductCascade.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteProductCascadeMutation(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("D-01-OSK");
    });

    expect(deleteProductCascade).toHaveBeenCalledWith("D-01-OSK");
    expect(invalidateProductsMock).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: produkKeys.stokMap });
  });
});
