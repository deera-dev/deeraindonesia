import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchBatches: vi.fn().mockResolvedValue([]),
  createBatches: vi.fn().mockResolvedValue(undefined),
  updateBatch: vi.fn().mockResolvedValue(undefined),
  deleteBatchAndProduct: vi.fn().mockResolvedValue(undefined),
  resyncBahanDipakai: vi.fn().mockResolvedValue([]),
}));

import { fetchBatches, resyncBahanDipakai } from "./api";
import {
  produksiRecordKeys,
  useBatchesQuery,
  useCreateBatchesMutation,
  useDeleteBatchMutation,
  useResyncBahanDipakaiMutation,
  useUpdateBatchMutation,
} from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("produksiRecordKeys", () => {
  it("has batches key", () => {
    expect(produksiRecordKeys.batches).toEqual(["produksi-record", "batches"]);
  });
});

describe("useBatchesQuery", () => {
  it("calls fetchBatches", async () => {
    const { result } = renderHook(() => useBatchesQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchBatches).toHaveBeenCalled();
  });
});

describe("useCreateBatchesMutation", () => {
  it("has mutateAsync", () => {
    const { result } = renderHook(() => useCreateBatchesMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe("useUpdateBatchMutation", () => {
  it("has mutateAsync", () => {
    const { result } = renderHook(() => useUpdateBatchMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe("useDeleteBatchMutation", () => {
  it("has mutateAsync", () => {
    const { result } = renderHook(() => useDeleteBatchMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe("useResyncBahanDipakaiMutation", () => {
  it("has mutateAsync", () => {
    const { result } = renderHook(() => useResyncBahanDipakaiMutation(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });

  it("calls resyncBahanDipakai with the batch", async () => {
    const { result } = renderHook(() => useResyncBahanDipakaiMutation(), { wrapper });
    const batch = { id: "b1", kode_produk: "D-01-OSK", total_kain: 5 };
    await result.current.mutateAsync(batch);
    expect(resyncBahanDipakai).toHaveBeenCalledWith(batch);
  });
});
