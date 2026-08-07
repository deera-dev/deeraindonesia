import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./api", () => ({
  fetchSalesByPelanggan: vi.fn().mockResolvedValue([{ id: "s1" }]),
  fetchSalesByBuyerName: vi.fn().mockResolvedValue([{ id: "s2" }]),
}));

import { useSalesByPelangganQuery, useSalesByBuyerNameQuery, pelangganKeys } from "./queries";
import { fetchSalesByPelanggan, fetchSalesByBuyerName } from "./api";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pelangganKeys", () => {
  it("salesByPelanggan builds a stable key array", () => {
    expect(pelangganKeys.salesByPelanggan("p1")).toEqual(["pelanggan-pos", "sales", "p1"]);
  });
  it("salesByBuyerName builds a stable key array", () => {
    expect(pelangganKeys.salesByBuyerName("BUDI")).toEqual(["pelanggan-pos", "sales-by-name", "BUDI"]);
  });
});

describe("useSalesByPelangganQuery", () => {
  it("fetches sales for the given pelangganId", async () => {
    const { result } = renderHook(() => useSalesByPelangganQuery("p1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSalesByPelanggan).toHaveBeenCalledWith("p1");
    expect(result.current.data).toEqual([{ id: "s1" }]);
  });

  it("is disabled (does not fetch) when pelangganId is falsy", async () => {
    const { result } = renderHook(() => useSalesByPelangganQuery(undefined), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSalesByPelanggan).not.toHaveBeenCalled();
  });
});

describe("useSalesByBuyerNameQuery", () => {
  it("fetches sales for the given buyerName", async () => {
    const { result } = renderHook(() => useSalesByBuyerNameQuery("HJ MIMI TEGAL"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSalesByBuyerName).toHaveBeenCalledWith("HJ MIMI TEGAL");
    expect(result.current.data).toEqual([{ id: "s2" }]);
  });

  it("is disabled (does not fetch) when buyerName is falsy", async () => {
    const { result } = renderHook(() => useSalesByBuyerNameQuery(undefined), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSalesByBuyerName).not.toHaveBeenCalled();
  });
});
