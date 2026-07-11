import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

const mockInvalidateStokBahan = vi.fn();
vi.mock("./queries", () => ({
  useBahanItemsQuery: vi.fn(() => ({ data: [{ id: 1 }], isLoading: false })),
  useStokBahanQuery: vi.fn(() => ({ data: [{ nama_bahan: "Wolfis" }], isLoading: false })),
  useSaveBahanMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useToggleLunasMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue("lunas") })),
  useDeleteBahanMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useMergeDupesMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(0) })),
  useInvalidateStokBahan: () => mockInvalidateStokBahan,
}));
vi.mock("./api", () => ({
  detectDupes: vi.fn().mockResolvedValue([[{ id: "a" }, { id: "b" }]]),
}));

import {
  useBahanItems, useStokBahan, useSaveBahan,
  useToggleLunas, useDeleteBahan, useMergeDupes, detectDupes,
  useInvalidateStokBahan,
} from "./hooks";
import {
  useBahanItemsQuery, useSaveBahanMutation, useToggleLunasMutation,
  useDeleteBahanMutation, useMergeDupesMutation,
} from "./queries";

const wrapper = createWrapper();

describe("useBahanItems", () => {
  it("returns items and loading state", () => {
    const { result } = renderHook(() => useBahanItems("bahan_pembelian"), { wrapper });
    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data is null (loading)", () => {
    useBahanItemsQuery.mockReturnValueOnce({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useBahanItems("bahan_pembelian"), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useStokBahan", () => {
  it("returns data and loading", () => {
    const { result } = renderHook(() => useStokBahan(), { wrapper });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });
});

describe("useSaveBahan", () => {
  it("returns a function that calls mutateAsync", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useSaveBahanMutation.mockReturnValueOnce({ mutateAsync });
    const { result } = renderHook(() => useSaveBahan("bahan_pembelian"), { wrapper });
    await result.current({ nama_bahan: "Wolfis" }, null, {}, "pembelian");
    expect(mutateAsync).toHaveBeenCalledWith({
      payload: { nama_bahan: "Wolfis" },
      editing: null,
      meta: {},
      activeTab: "pembelian",
    });
  });
});

describe("useToggleLunas", () => {
  it("returns a function that calls mutateAsync with item", async () => {
    const mutateAsync = vi.fn().mockResolvedValue("lunas");
    useToggleLunasMutation.mockReturnValueOnce({ mutateAsync });
    const { result } = renderHook(() => useToggleLunas("bahan_pembelian"), { wrapper });
    await result.current({ id: "x", status_bayar: "belum" });
    expect(mutateAsync).toHaveBeenCalledWith({ id: "x", status_bayar: "belum" });
  });
});

describe("useDeleteBahan", () => {
  it("returns a function that calls mutateAsync with item and tab", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useDeleteBahanMutation.mockReturnValueOnce({ mutateAsync });
    const { result } = renderHook(() => useDeleteBahan("bahan_pembelian"), { wrapper });
    const item = { id: "y" };
    await result.current(item, "pembelian");
    expect(mutateAsync).toHaveBeenCalledWith({ item, activeTab: "pembelian" });
  });
});

describe("useMergeDupes", () => {
  it("returns a function that calls mutateAsync with groups", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(0);
    useMergeDupesMutation.mockReturnValueOnce({ mutateAsync });
    const { result } = renderHook(() => useMergeDupes("bahan_pembelian"), { wrapper });
    const groups = [[{ id: "a" }, { id: "b" }]];
    const errors = await result.current(groups);
    expect(mutateAsync).toHaveBeenCalledWith(groups);
    expect(errors).toBe(0);
  });
});

describe("detectDupes re-export", () => {
  it("is exported from hooks and calls api.detectDupes", async () => {
    const result = await detectDupes("bahan_pembelian");
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("useInvalidateStokBahan re-export", () => {
  it("is re-exported from queries.js unchanged", () => {
    const { result } = renderHook(() => useInvalidateStokBahan(), { wrapper });
    expect(result.current).toBe(mockInvalidateStokBahan);
  });
});
