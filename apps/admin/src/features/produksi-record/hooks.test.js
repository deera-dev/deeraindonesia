import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useBatchesQuery: vi.fn(),
  useCreateBatchesMutation: vi.fn(),
  useUpdateBatchMutation: vi.fn(),
  useDeleteBatchMutation: vi.fn(),
  useResyncBahanDipakaiMutation: vi.fn(),
}));
vi.mock("./api", () => ({ fetchHppTemplate: vi.fn().mockResolvedValue(null) }));

import {
  useBatches, useCreateBatches, useUpdateBatch, useDeleteBatch, useResyncBahanDipakai,
  fetchHppTemplate, useBatchFilter,
} from "./hooks";
import { useBatchFilterStore, DEFAULT_BATCH_FILTER } from "./store";
import { act } from "@testing-library/react";
import {
  useBatchesQuery, useCreateBatchesMutation, useUpdateBatchMutation, useDeleteBatchMutation,
  useResyncBahanDipakaiMutation,
} from "./queries";

const wrapper = createWrapper();
const mockMutate = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useBatchesQuery.mockReturnValue({ data: [{ id: "b1" }], isLoading: false });
  useCreateBatchesMutation.mockReturnValue({ mutateAsync: mockMutate });
  useUpdateBatchMutation.mockReturnValue({ mutateAsync: mockMutate });
  useDeleteBatchMutation.mockReturnValue({ mutateAsync: mockMutate });
  useResyncBahanDipakaiMutation.mockReturnValue({ mutateAsync: mockMutate });
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

describe("useResyncBahanDipakai", () => {
  it("calls mutateAsync with the batch", async () => {
    const { result } = renderHook(() => useResyncBahanDipakai(), { wrapper });
    const batch = { id: "b1", kode_produk: "D-01-OSK" };
    await result.current(batch);
    expect(mockMutate).toHaveBeenCalledWith(batch);
  });
});

describe("fetchHppTemplate re-export", () => {
  it("is a function", () => {
    expect(typeof fetchHppTemplate).toBe("function");
  });
});

describe("useBatchFilter", () => {
  beforeEach(() => {
    useBatchFilterStore.setState({
      applied: { ...DEFAULT_BATCH_FILTER },
      draft: { ...DEFAULT_BATCH_FILTER },
      isModalOpen: false,
    });
  });

  it("returns default applied filter dan hasActiveFilter false", () => {
    const { result } = renderHook(() => useBatchFilter());
    expect(result.current.applied).toEqual(DEFAULT_BATCH_FILTER);
    expect(result.current.hasActiveFilter).toBe(false);
  });

  it("openModal menyalin applied ke draft dan membuka modal", () => {
    const { result } = renderHook(() => useBatchFilter());
    act(() => result.current.setDraft({ potongMin: "10" }));
    act(() => result.current.applyDraft());
    act(() => result.current.openModal());
    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.draft.potongMin).toBe("10");
  });

  it("applyDraft memindahkan draft ke applied dan menutup modal", () => {
    const { result } = renderHook(() => useBatchFilter());
    act(() => result.current.openModal());
    act(() => result.current.setDraft({ bahanStatus: "belum" }));
    act(() => result.current.applyDraft());
    expect(result.current.applied.bahanStatus).toBe("belum");
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.hasActiveFilter).toBe(true);
  });

  it("closeModal membuang draft (reset ke applied) dan menutup modal", () => {
    const { result } = renderHook(() => useBatchFilter());
    act(() => result.current.openModal());
    act(() => result.current.setDraft({ hppMin: "50000" }));
    act(() => result.current.closeModal());
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.draft.hppMin).toBe("");
  });

  it("resetAll mengembalikan semua state ke default", () => {
    const { result } = renderHook(() => useBatchFilter());
    act(() => result.current.setDraft({ upahJahitMin: "1000" }));
    act(() => result.current.applyDraft());
    act(() => result.current.resetAll());
    expect(result.current.applied).toEqual(DEFAULT_BATCH_FILTER);
    expect(result.current.draft).toEqual(DEFAULT_BATCH_FILTER);
    expect(result.current.hasActiveFilter).toBe(false);
  });
});
