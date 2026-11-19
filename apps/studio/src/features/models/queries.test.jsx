import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchModels: vi.fn().mockResolvedValue([{ id: "m1" }]),
  createModel: vi.fn().mockResolvedValue({ id: "m2" }),
  updateModel: vi.fn().mockResolvedValue({ id: "m1" }),
  deleteModel: vi.fn().mockResolvedValue(undefined),
}));

import {
  modelKeys,
  useCreateModelMutation,
  useDeleteModelMutation,
  useModelsQuery,
  useUpdateModelMutation,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("modelKeys", () => {
  it("list key includes onlyActive flag", () => {
    expect(modelKeys.list(true)).toEqual(["models", "list", true]);
    expect(modelKeys.list(false)).toEqual(["models", "list", false]);
  });
});

describe("useModelsQuery", () => {
  it("fetches models", async () => {
    const { result } = renderHook(() => useModelsQuery(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("mutations", () => {
  it("useCreateModelMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useCreateModelMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ name: "A", thumbnail_url: null });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdateModelMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useUpdateModelMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: "m1", patch: { is_active: false } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeleteModelMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useDeleteModelMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync("m1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
