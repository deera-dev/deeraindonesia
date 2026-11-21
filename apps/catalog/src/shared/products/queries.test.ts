import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "../../../../../test/helpers/renderWithProviders";

const fetchProducts = vi.fn();
vi.mock("./api", () => ({ fetchProducts: (...args: unknown[]) => fetchProducts(...args) }));

const { useProductsQuery } = await import("./queries");

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
