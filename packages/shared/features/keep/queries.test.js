import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const fetchActiveKeepItems = vi.fn();
vi.mock("./api", () => ({ fetchActiveKeepItems: (...args) => fetchActiveKeepItems(...args) }));

const { useActiveKeepItemsQuery } = await import("./queries");

describe("useActiveKeepItemsQuery", () => {
  beforeEach(() => {
    fetchActiveKeepItems.mockReset();
  });

  it("memanggil fetchActiveKeepItems dan mengembalikan data", async () => {
    const data = [{ kode: "D-07-OSK", qty: 2 }];
    fetchActiveKeepItems.mockResolvedValue(data);

    const { result } = renderHook(() => useActiveKeepItemsQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchActiveKeepItems).toHaveBeenCalled();
    expect(result.current.data).toBe(data);
  });
});
