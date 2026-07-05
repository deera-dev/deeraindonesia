import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const useProductsQuery = vi.fn();
const useInvalidateProducts = vi.fn();
vi.mock("./queries", () => ({
  useProductsQuery: (...args) => useProductsQuery(...args),
  useInvalidateProducts: (...args) => useInvalidateProducts(...args),
}));

const { useProducts, useProduct } = await import("./hooks");

describe("useProducts", () => {
  beforeEach(() => {
    useProductsQuery.mockReset();
  });

  it("mengembalikan { products, loading, error } dari data query", () => {
    useProductsQuery.mockReturnValue({
      data: [{ kode: "D-07-OSK" }],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    expect(result.current.products).toEqual([{ kode: "D-07-OSK" }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fallback products ke null saat data undefined (masih loading)", () => {
    useProductsQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    expect(result.current.products).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});

describe("useProduct", () => {
  beforeEach(() => {
    useProductsQuery.mockReset();
  });

  it("menemukan produk berdasarkan kode", () => {
    const produk = { kode: "D-07-OSK", nama: "Gamis A" };
    useProductsQuery.mockReturnValue({ data: [produk], isLoading: false, error: null });

    const { result } = renderHook(() => useProduct("D-07-OSK"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.product).toBe(produk);
  });

  it("mengembalikan null saat produk dengan kode tersebut tidak ditemukan", () => {
    useProductsQuery.mockReturnValue({
      data: [{ kode: "D-08-XYZ" }],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useProduct("D-99-NONE"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.product).toBeNull();
  });

  it("mengembalikan null saat products masih null (belum ada data)", () => {
    useProductsQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { result } = renderHook(() => useProduct("D-07-OSK"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.product).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
