import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useBatchesQuery: vi.fn(),
  useCreateBatchesMutation: vi.fn(),
  useUpdateBatchMutation: vi.fn(),
  useDeleteBatchMutation: vi.fn(),
}));
vi.mock("./api", () => ({ fetchHppTemplate: vi.fn().mockResolvedValue(null) }));

import { useBatches, useCreateBatches, useUpdateBatch, useDeleteBatch, fetchHppTemplate } from "./hooks";
import { useBatchesQuery, useCreateBatchesMutation, useUpdateBatchMutation, useDeleteBatchMutation } from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useBatchesQuery.mockReturnValue({ data: [{ id: "b1" }], isLoading: false });
  useCreateBatchesMutation.mockReturnValue({ mutateAsync: mockMutate });
  useUpdateBatchMutation.mockReturnValue({ mutateAsync: mockMutate });
  useDeleteBatchMutation.mockReturnValue({ mutateAsync: mockMutate });
});

describe("useBatches", () => {
  it("returns batches and loading", () => {
    const { result } = renderHook(() => useBatches(), { wrapper });
    expect(result.current.batches).toEqual([{ id: "b1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useBatchesQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useBatches(), { wrapper });
    expect(result.current.batches).toEqual([]);
  });
});

describe("useCreateBatches", () => {
  it("calls mutateAsync with entries and shared", async () => {
    const { result } = renderHook(() => useCreateBatches(), { wrapper });
    await result.current([{ id: "e1" }], { meta: "x" });
    expect(mockMutate).toHaveBeenCalledWith({ entries: [{ id: "e1" }], shared: { meta: "x" } });
  });
});

describe("useUpdateBatch", () => {
  it("calls mutateAsync", async () => {
    const { result } = renderHook(() => useUpdateBatch(), { wrapper });
    await result.current({ id: "p1" }, [], {});
    expect(mockMutate).toHaveBeenCalled();
  });
});

describe("useDeleteBatch", () => {
  it("calls mutateAsync", async () => {
    const { result } = renderHook(() => useDeleteBatch(), { wrapper });
    await result.current({ id: "b1" });
    expect(mockMutate).toHaveBeenCalledWith({ id: "b1" });
  });
});

describe("fetchHppTemplate re-export", () => {
  it("is a function", () => {
    expect(typeof fetchHppTemplate).toBe("function");
  });
});
