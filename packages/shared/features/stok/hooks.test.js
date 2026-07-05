import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const useStokByLocationQuery = vi.fn();
vi.mock("./queries", () => ({
  useStokByLocationQuery: (...args) => useStokByLocationQuery(...args),
}));

const { useStokByLocation } = await import("./hooks");

describe("useStokByLocation", () => {
  beforeEach(() => {
    useStokByLocationQuery.mockReset();
  });

  it("mengembalikan { items, loading } dari data query", () => {
    useStokByLocationQuery.mockReturnValue({ data: [{ kode: "D-07-OSK" }], isLoading: false });

    const { result } = renderHook(() => useStokByLocation("gudang"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.items).toEqual([{ kode: "D-07-OSK" }]);
    expect(result.current.loading).toBe(false);
  });

  it("fallback items ke array kosong saat data undefined", () => {
    useStokByLocationQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useStokByLocation(null), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
