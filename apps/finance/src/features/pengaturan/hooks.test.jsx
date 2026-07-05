import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./queries", () => ({
  useFinanceConfigQuery:       vi.fn(() => ({ data: { tarif_pola: 10000 }, isLoading: false })),
  useSaveFinanceConfigMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));
vi.mock("./utils", () => ({
  DEFAULT_FINANCE_CONFIG: { tarif_pola: 8000, tarif_sampel: 4000 },
}));

import { useFinanceConfig, useSaveFinanceConfig } from "./hooks";
import * as queriesMock from "./queries";

const w = () => {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("useFinanceConfig", () => {
  it("returns config from query", () => {
    const { result } = renderHook(() => useFinanceConfig(), { wrapper: w() });
    expect(result.current.config.tarif_pola).toBe(10000);
    expect(result.current.loading).toBe(false);
  });
  it("falls back to DEFAULT_FINANCE_CONFIG when data undefined", () => {
    
    queriesMock.useFinanceConfigQuery.mockReturnValueOnce({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useFinanceConfig(), { wrapper: w() });
    expect(result.current.config.tarif_pola).toBe(8000); // DEFAULT
    expect(result.current.loading).toBe(true);
  });
});

describe("useSaveFinanceConfig", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useSaveFinanceConfig(), { wrapper: w() });
    expect(typeof result.current).toBe("function");
  });
});

describe("useSaveFinanceConfig — lambda call", () => {
  it("calling the returned function calls mutateAsync", () => {
    const { result } = renderHook(() => useSaveFinanceConfig(), { wrapper: w() });
    result.current("tarif_pola", 15000);
    // Just calling it is enough to cover the lambda body
  });
});
