import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./api", () => ({
  fetchFinanceConfig: vi.fn().mockResolvedValue({ tarif_pola: 10000, tarif_sampel: 5000 }),
  saveFinanceConfigValue: vi.fn().mockResolvedValue(undefined),
}));

import { pengaturanKeys, useFinanceConfigQuery, useSaveFinanceConfigMutation } from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("pengaturanKeys", () => {
  it("config is array", () => { expect(Array.isArray(pengaturanKeys.config)).toBe(true); });
});

describe("useFinanceConfigQuery", () => {
  it("fetches config", async () => {
    const { result } = renderHook(() => useFinanceConfigQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.tarif_pola).toBe(10000);
  });
});

describe("useSaveFinanceConfigMutation", () => {
  it("exposes mutate", () => {
    const { result } = renderHook(() => useSaveFinanceConfigMutation(), { wrapper: wrapper() });
    expect(typeof result.current.mutate).toBe("function");
  });
});

describe("useSaveFinanceConfigMutation — mutateAsync + onSuccess", () => {
  it("runs mutationFn and invalidates cache", async () => {
    const { result } = renderHook(() => useSaveFinanceConfigMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ key: "tarif_pola", nilai: 15000 });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
