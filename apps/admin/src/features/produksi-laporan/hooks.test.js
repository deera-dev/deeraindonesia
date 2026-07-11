import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./queries", () => ({
  useProduksiBatchesQuery: vi.fn().mockReturnValue({
    data: { batches: [{ id: "b1" }], ringkasan: {}, bahanUsage: [] },
    isLoading: false,
  }),
  useTagihanJatuhTempoQuery: vi.fn().mockReturnValue({ data: [{ id: "t1" }], isLoading: false }),
  useProduksiBatchesTotalQuery: vi.fn().mockReturnValue({
    data: { totalBatch: 0, totalBaju: 0, totalModal: 0 },
    isLoading: false,
  }),
}));

import { useProduksiBatches, useTagihanJatuhTempo, useProduksiBatchesTotal } from "./hooks";
import {
  useProduksiBatchesQuery,
  useTagihanJatuhTempoQuery,
  useProduksiBatchesTotalQuery,
} from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

// useProduksiBatches sekarang meneruskan { batches, ringkasan, bahanUsage }
// apa adanya dari RPC get_laporan_produksi — hook TIDAK LAGI melakukan
// calcRingkasan/calcBahanUsage (business logic tersebut sudah dipindahkan
// sepenuhnya ke SQL, lihat api.js).
describe("useProduksiBatches", () => {
  it("meneruskan batches, ringkasan, bahanUsage dari query apa adanya", () => {
    useProduksiBatchesQuery.mockReturnValue({
      data: {
        batches: [{ id: "b1" }],
        ringkasan: { totalBatch: 1, totalBaju: 5, totalModal: 425000, hppAvg: 85000, hargaJualAvg: 300000 },
        bahanUsage: [{ nama: "Wolfis", satuan: "yard", jumlah: 5 }],
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.batches).toEqual([{ id: "b1" }]);
    expect(result.current.ringkasan).toEqual({ totalBatch: 1, totalBaju: 5, totalModal: 425000, hppAvg: 85000, hargaJualAvg: 300000 });
    expect(result.current.bahanUsage).toEqual([{ nama: "Wolfis", satuan: "yard", jumlah: 5 }]);
    expect(result.current.loading).toBe(false);
  });

  it("returns [] / {} / [] fallback when data undefined", () => {
    useProduksiBatchesQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.batches).toEqual([]);
    expect(result.current.ringkasan).toEqual({});
    expect(result.current.bahanUsage).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("useTagihanJatuhTempo", () => {
  it("returns tagihan and loading=false", () => {
    useTagihanJatuhTempoQuery.mockReturnValue({ data: [{ id: "t1" }], isLoading: false });
    const { result } = renderHook(() => useTagihanJatuhTempo({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.tagihan).toEqual([{ id: "t1" }]);
    expect(result.current.loading).toBe(false);
  });
  it("returns [] when data undefined", () => {
    useTagihanJatuhTempoQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useTagihanJatuhTempo({ fromDate: "2024-01-01", toDate: "2024-01-31" }), { wrapper });
    expect(result.current.tagihan).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

// useProduksiBatchesTotal — hook ini pass-through murni dari hasil agregasi
// RPC get_produksi_batches_total. Test berikut membuktikan hook TIDAK
// melakukan business logic apa pun — hanya meneruskan field
// totalBatch/totalBaju/totalModal dari query, dengan fallback ke 0 kalau
// data belum ada.
describe("useProduksiBatchesTotal", () => {
  it("meneruskan totalBatch/totalBaju/totalModal dari query apa adanya", () => {
    useProduksiBatchesTotalQuery.mockReturnValue({
      data: { totalBatch: 24, totalBaju: 120, totalModal: 10200000 },
      isLoading: false,
    });
    const { result } = renderHook(() => useProduksiBatchesTotal(), { wrapper });
    expect(result.current).toEqual({
      totalBatch: 24,
      totalBaju: 120,
      totalModal: 10200000,
      loading: false,
    });
  });

  it("data undefined (belum termuat) -> fallback totalBatch/totalBaju/totalModal ke 0, loading true", () => {
    useProduksiBatchesTotalQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useProduksiBatchesTotal(), { wrapper });
    expect(result.current).toEqual({
      totalBatch: 0,
      totalBaju: 0,
      totalModal: 0,
      loading: true,
    });
  });

  it("field individual hilang dari data (mis. hanya totalBatch ada) -> field lain tetap fallback ke 0", () => {
    useProduksiBatchesTotalQuery.mockReturnValue({
      data: { totalBatch: 5 },
      isLoading: false,
    });
    const { result } = renderHook(() => useProduksiBatchesTotal(), { wrapper });
    expect(result.current).toEqual({
      totalBatch: 5,
      totalBaju: 0,
      totalModal: 0,
      loading: false,
    });
  });
});
