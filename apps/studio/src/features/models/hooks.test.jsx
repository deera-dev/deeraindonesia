import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./queries", () => ({
  useModelsQuery: vi.fn(() => ({ data: [{ id: "m1" }], isLoading: false, error: null })),
  useCreateModelMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateModelMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteModelMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useCreateModel, useDeleteModel, useModels, useUpdateModel } from "./hooks";
import { useModelsQuery } from "./queries";

function wrapper() {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useModels", () => {
  it("returns models and loading=false", () => {
    const { result } = renderHook(() => useModels(), { wrapper: wrapper() });
    expect(result.current.models).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it("returns empty array when data is undefined", () => {
    useModelsQuery.mockReturnValueOnce({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => useModels(), { wrapper: wrapper() });
    expect(result.current.models).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("function hooks", () => {
  it("useCreateModel returns a function", () => {
    const { result } = renderHook(() => useCreateModel(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
    result.current({ name: "A", thumbnail_url: null });
  });

  it("useUpdateModel returns a function", () => {
    const { result } = renderHook(() => useUpdateModel(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
    result.current({ id: "m1", patch: {} });
  });

  it("useDeleteModel returns a function", () => {
    const { result } = renderHook(() => useDeleteModel(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
    result.current("m1");
  });
});
