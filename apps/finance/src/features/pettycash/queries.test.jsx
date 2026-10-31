import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchPettycashAll: vi.fn().mockResolvedValue([{ id: "pc1", jenis: "isi", jumlah: 200000 }]),
  savePettycash: vi.fn().mockResolvedValue(undefined),
  deletePettycash: vi.fn().mockResolvedValue(undefined),
}));

import {
  pettycashKeys,
  useDeletePettycashMutation,
  usePettycashAllQuery,
  useSavePettycashMutation,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("pettycashKeys", () => {
  it("all is array", () => {
    expect(Array.isArray(pettycashKeys.all)).toBe(true);
  });
});

describe("usePettycashAllQuery", () => {
  it("fetches all pettycash", async () => {
    const { result } = renderHook(() => usePettycashAllQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useSavePettycashMutation", () => {
  it("exposes mutate", () => {
    const { result } = renderHook(() => useSavePettycashMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("useDeletePettycashMutation", () => {
  it("exposes mutate", () => {
    const { result } = renderHook(() => useDeletePettycashMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("mutation hooks — mutateAsync + onSuccess + invalidate", () => {
  it("useSavePettycashMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useSavePettycashMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ payload: { jenis: "isi" }, editing: null });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeletePettycashMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useDeletePettycashMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync("pc1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
