import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";
import { createTestQueryClient } from "../../../../test/helpers/queryClient";

const fetchProducts = vi.fn();
vi.mock("./api", () => ({ fetchProducts: (...args) => fetchProducts(...args) }));

const { useProductsQuery, useInvalidateProducts, productKeys } = await import("./queries");

describe("useProductsQuery", () => {
  beforeEach(() => {
    fetchProducts.mockReset();
  });

  it("memanggil fetchProducts dan mengembalikan data via TanStack Query", async () => {
    const data = [{ kode: "D-07-OSK" }];
    fetchProducts.mockResolvedValue(data);

    const { result } = renderHook(() => useProductsQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
    expect(fetchProducts).toHaveBeenCalled();
  });
});

describe("useInvalidateProducts", () => {
  it("mengembalikan fungsi yang men-invalidate query productKeys.all", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateProducts(), {
      wrapper: createQueryWrapper(queryClient),
    });

    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: productKeys.all });
  });
});
