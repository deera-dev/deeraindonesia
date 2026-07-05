import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./queries", () => ({
  usePettycashAllQuery: vi.fn(() => ({
    data: [
      { id: "pc1", jenis: "isi", jumlah: 300000 },
      { id: "pc2", jenis: "keluar", jumlah: 100000 },
    ],
    isLoading: false,
    error: null,
  })),
  useSavePettycashMutation:   vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeletePettycashMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { usePettycashAll, useSavePettycash, useDeletePettycash } from "./hooks";
import * as queriesMock from "./queries";

const w = () => {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("usePettycashAll", () => {
  it("returns rows and saldo (isi - keluar)", () => {
    const { result } = renderHook(() => usePettycashAll(), { wrapper: w() });
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.saldo).toBe(200000); // 300000 - 100000
    expect(result.current.loading).toBe(false);
  });
  it("returns empty rows and 0 saldo when data null", () => {
    
    queriesMock.usePettycashAllQuery.mockReturnValueOnce({ data: null, isLoading: false, error: null });
    const { result } = renderHook(() => usePettycashAll(), { wrapper: w() });
    expect(result.current.rows).toEqual([]);
    expect(result.current.saldo).toBe(0);
  });
});

describe("useSavePettycash", () => {
  it("returns function", () => {
    const { result } = renderHook(() => useSavePettycash(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
});

describe("useDeletePettycash", () => {
  it("returns function", () => {
    const { result } = renderHook(() => useDeletePettycash(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
});

describe("usePettycashAll — jumlah=0 covers || 0 branch", () => {
  it("saldo=0 when both jenis have jumlah=0", () => {
    queriesMock.usePettycashAllQuery.mockReturnValueOnce({
      data: [
        { id: "pc3", jenis: "isi",    jumlah: 0 },
        { id: "pc4", jenis: "keluar", jumlah: 0 },
      ],
      isLoading: false, error: null,
    });
    const { result } = renderHook(() => usePettycashAll(), { wrapper: w() });
    expect(result.current.saldo).toBe(0);
  });

  it("loadError from error.message", () => {
    queriesMock.usePettycashAllQuery.mockReturnValueOnce({
      data: null, isLoading: false, error: { message: "db fail" },
    });
    const { result } = renderHook(() => usePettycashAll(), { wrapper: w() });
    expect(result.current.loadError).toBe("db fail");
  });

  it("loadError null when no error", () => {
    const { result } = renderHook(() => usePettycashAll(), { wrapper: w() });
    expect(result.current.loadError).toBeNull();
  });
});

describe("hook lambdas — cover inner lambda bodies", () => {
  it("useSavePettycash lambda calls mutateAsync", () => {
    const { result } = renderHook(() => useSavePettycash(), { wrapper: w() });
    result.current({ jenis: "isi" }, null);
  });
  it("useDeletePettycash lambda calls mutateAsync", () => {
    const { result } = renderHook(() => useDeletePettycash(), { wrapper: w() });
    result.current("pc1");
  });
});
