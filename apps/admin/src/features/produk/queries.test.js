import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../../test/helpers/queryClient";

const fetchStokMap = vi.fn();
const fetchStokWarnaByKode = vi.fn();
const fetchProducedByKode = vi.fn();
const fetchDikirimByKode = vi.fn();
const fetchSalesDetailByKode = vi.fn();
const saveProduct = vi.fn();
const deleteProductCascade = vi.fn();
vi.mock("./api", () => ({
  fetchStokMap: (...args) => fetchStokMap(...args),
  fetchStokWarnaByKode: (...args) => fetchStokWarnaByKode(...args),
  fetchProducedByKode: (...args) => fetchProducedByKode(...args),
  fetchDikirimByKode: (...args) => fetchDikirimByKode(...args),
  fetchSalesDetailByKode: (...args) => fetchSalesDetailByKode(...args),
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
  useProducedByKodeQuery,
  useDikirimByKodeQuery,
  useSalesDetailByKodeQuery,
  useSaveProductMutation,
  useDeleteProductCascadeMutation,
} = await import("./queries");

beforeEach(() => {
  fetchStokMap.mockReset();
  fetchStokWarnaByKode.mockReset();
  fetchProducedByKode.mockReset();
  fetchDikirimByKode.mockReset();
  fetchSalesDetailByKode.mockReset();
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

describe("useProducedByKodeQuery", () => {
  it("memanggil fetchProducedByKode dengan kode saat kode tersedia", async () => {
    const data = { Midi: 14, "Gamis Jumbo": 7 };
    fetchProducedByKode.mockResolvedValue(data);

    const { result } = renderHook(() => useProducedByKodeQuery("D-01-OSK"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProducedByKode).toHaveBeenCalledWith("D-01-OSK");
    expect(result.current.data).toBe(data);
  });

  it("tidak fetch saat kode falsy", () => {
    const { result } = renderHook(() => useProducedByKodeQuery(undefined), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchProducedByKode).not.toHaveBeenCalled();
  });
});

describe("useDikirimByKodeQuery", () => {
  it("memanggil fetchDikirimByKode dengan kode saat kode tersedia", async () => {
    const data = { gudang: 4, cideng: 2, tegalgubug: 0, total: 6 };
    fetchDikirimByKode.mockResolvedValue(data);

    const { result } = renderHook(() => useDikirimByKodeQuery("D-01-OSK"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchDikirimByKode).toHaveBeenCalledWith("D-01-OSK");
    expect(result.current.data).toBe(data);
  });

  it("tidak fetch saat kode falsy", () => {
    const { result } = renderHook(() => useDikirimByKodeQuery(undefined), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchDikirimByKode).not.toHaveBeenCalled();
  });
});

describe("useSalesDetailByKodeQuery", () => {
  it("memanggil fetchSalesDetailByKode dengan kode saat kode tersedia", async () => {
    const data = [
      { id: "s1", created_at: "2026-08-20T10:00:00Z", buyer_name: "Alex", buyer_hp: "0812", location: "gudang", qty: 2 },
    ];
    fetchSalesDetailByKode.mockResolvedValue(data);

    const { result } = renderHook(() => useSalesDetailByKodeQuery("D-01-OSK"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSalesDetailByKode).toHaveBeenCalledWith("D-01-OSK");
    expect(result.current.data).toBe(data);
  });

  it("tidak fetch saat kode falsy", () => {
    const { result } = renderHook(() => useSalesDetailByKodeQuery(undefined), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSalesDetailByKode).not.toHaveBeenCalled();
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
    expect(invalidateProductsMock).toHaveBeenCalled();
  });
});
