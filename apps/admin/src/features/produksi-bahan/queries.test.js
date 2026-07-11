import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchBahanItems: vi.fn().mockResolvedValue([{ id: 1, nama_bahan: "Wolfis" }]),
  fetchStokBahan: vi.fn().mockResolvedValue([{ nama_bahan: "Wolfis", stok_sisa: 5 }]),
  saveBahanItem: vi.fn().mockResolvedValue(undefined),
  toggleLunas: vi.fn().mockResolvedValue("lunas"),
  deleteBahanItem: vi.fn().mockResolvedValue(undefined),
  mergeDupeGroups: vi.fn().mockResolvedValue(0),
}));

import {
  useBahanItemsQuery, useStokBahanQuery,
  useSaveBahanMutation, useToggleLunasMutation,
  useDeleteBahanMutation, useMergeDupesMutation,
  useInvalidateStokBahan,
  produksiBahanKeys,
} from "./queries";
import { fetchBahanItems, fetchStokBahan, saveBahanItem, toggleLunas, deleteBahanItem, mergeDupeGroups } from "./api";

const wrapper = createWrapper();

describe("produksiBahanKeys", () => {
  it("items key includes table", () => {
    expect(produksiBahanKeys.items("bahan_pembelian")).toEqual(["produksi-bahan", "items", "bahan_pembelian"]);
  });
  it("stok key is array", () => {
    expect(Array.isArray(produksiBahanKeys.stok)).toBe(true);
  });
});

describe("useBahanItemsQuery", () => {
  it("fetches items for given table", async () => {
    const { result } = renderHook(() => useBahanItemsQuery("bahan_pembelian"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchBahanItems).toHaveBeenCalledWith("bahan_pembelian");
    expect(result.current.data).toEqual([{ id: 1, nama_bahan: "Wolfis" }]);
  });
});

describe("useStokBahanQuery", () => {
  it("fetches stok bahan", async () => {
    const { result } = renderHook(() => useStokBahanQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchStokBahan).toHaveBeenCalled();
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useSaveBahanMutation", () => {
  it("calls saveBahanItem with correct args", async () => {
    const { result } = renderHook(() => useSaveBahanMutation("bahan_pembelian"), { wrapper });
    await result.current.mutateAsync({ payload: { nama_bahan: "Wolfis" }, editing: null, meta: {}, activeTab: "pembelian" });
    expect(saveBahanItem).toHaveBeenCalledWith(expect.objectContaining({ table: "bahan_pembelian", activeTab: "pembelian" }));
  });
});

describe("useToggleLunasMutation", () => {
  it("calls toggleLunas with item", async () => {
    const { result } = renderHook(() => useToggleLunasMutation("bahan_pembelian"), { wrapper });
    const item = { id: "x", status_bayar: "belum" };
    await result.current.mutateAsync(item);
    expect(toggleLunas).toHaveBeenCalledWith("bahan_pembelian", item);
  });
});

describe("useDeleteBahanMutation", () => {
  it("calls deleteBahanItem with args", async () => {
    const { result } = renderHook(() => useDeleteBahanMutation("bahan_pembelian"), { wrapper });
    const item = { id: "y", nama_bahan: "Wolfis" };
    await result.current.mutateAsync({ item, activeTab: "pembelian" });
    expect(deleteBahanItem).toHaveBeenCalledWith({ table: "bahan_pembelian", item, activeTab: "pembelian" });
  });
});

describe("useMergeDupesMutation", () => {
  it("calls mergeDupeGroups with groups", async () => {
    const { result } = renderHook(() => useMergeDupesMutation("bahan_pembelian"), { wrapper });
    const groups = [[{ id: "a" }, { id: "b" }]];
    const errors = await result.current.mutateAsync(groups);
    expect(mergeDupeGroups).toHaveBeenCalledWith("bahan_pembelian", groups);
  });
});

describe("useInvalidateStokBahan", () => {
  it("invalidates the stok bahan query, triggering a refetch", async () => {
    // Wrapper baru (QueryClient terpisah) supaya call count fetchStokBahan
    // tidak terpengaruh test lain di file ini yang berbagi mock module-level.
    const localWrapper = createWrapper();
    const { result } = renderHook(
      () => ({
        query: useStokBahanQuery(),
        invalidate: useInvalidateStokBahan(),
      }),
      { wrapper: localWrapper },
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    const callsBeforeInvalidate = fetchStokBahan.mock.calls.length;

    await act(async () => {
      result.current.invalidate();
    });

    await waitFor(() =>
      expect(fetchStokBahan.mock.calls.length).toBeGreaterThan(callsBeforeInvalidate),
    );
  });
});
