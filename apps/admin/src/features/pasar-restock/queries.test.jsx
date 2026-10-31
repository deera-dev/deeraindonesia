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
  it("memanggil fetchPasarRestock dengan market", async () => {
    const { result } = renderHook(() => usePasarRestockQuery("cideng"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPasarRestock).toHaveBeenCalledWith("cideng");
    expect(pasarRestockKeys.market("cideng")).toEqual(["pasar-restock", "cideng"]);
  });
  it("tidak jalan tanpa market", () => {
    const { result } = renderHook(() => usePasarRestockQuery(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
