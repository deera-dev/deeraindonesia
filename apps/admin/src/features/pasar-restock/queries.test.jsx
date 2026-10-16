import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./api", () => ({ fetchPasarRestock: vi.fn(async (m) => ({ restock: [{ kode: m }], tidak_bergerak: [] })) }));
import { usePasarRestockQuery, pasarRestockKeys } from "./queries";
import { fetchPasarRestock } from "./api";

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
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
