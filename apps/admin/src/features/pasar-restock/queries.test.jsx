import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchPasarRestock: vi.fn(async (m) => ({ restock: [{ kode: m }], tidak_bergerak: [] })),
}));

import { fetchPasarRestock } from "./api";
import { pasarRestockKeys, usePasarRestockQuery } from "./queries";

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("usePasarRestockQuery", () => {
  it("memanggil fetchPasarRestock dengan market & target", async () => {
    const { result } = renderHook(() => usePasarRestockQuery("cideng", 2), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPasarRestock).toHaveBeenCalledWith("cideng", 2);
    expect(pasarRestockKeys.market("cideng", 2)).toEqual(["pasar-restock", "cideng", 2]);
  });
  it("tidak jalan tanpa market", () => {
    const { result } = renderHook(() => usePasarRestockQuery(null, 2), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
