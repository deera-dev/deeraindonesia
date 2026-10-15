import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchStokAll: vi.fn().mockResolvedValue([{ id: "s1", kode: "D-01-OSK" }]),
  fetchSoldKodesAtLocation: vi.fn().mockResolvedValue(["D-01-OSK"]),
  fetchProduksiBatches: vi.fn().mockResolvedValue([
    { kode_produk: "D-01-OSK", tanggal_produksi: "2026-10-01", sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 3 }] }] },
  ]),
}));

import { fetchStokAll, fetchSoldKodesAtLocation } from "./api";
import { pasarRestockKeys, useStokAllQuery, useSoldKodesQuery, useProduksiInfoQuery } from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("pasarRestockKeys", () => {
  it("stok key", () => {
    expect(pasarRestockKeys.stok).toEqual(["pasar-restock", "stok"]);
  });
  it("soldKodes key includes location & sinceDateStr", () => {
    expect(pasarRestockKeys.soldKodes("cideng", "2026-08-01")).toEqual([
      "pasar-restock",
      "sold-kodes",
      "cideng",
      "2026-08-01",
    ]);
  });
});

describe("useStokAllQuery", () => {
  it("returns stok data", async () => {
    const { result } = renderHook(() => useStokAllQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "s1", kode: "D-01-OSK" }]);
    expect(fetchStokAll).toHaveBeenCalled();
  });
});

describe("useSoldKodesQuery", () => {
  it("returns sold kodes when location & sinceDateStr provided", async () => {
    const { result } = renderHook(() => useSoldKodesQuery("cideng", "2026-08-01"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["D-01-OSK"]);
    expect(fetchSoldKodesAtLocation).toHaveBeenCalledWith("cideng", "2026-08-01");
  });

  it("disabled (tidak fetch) kalau location kosong", () => {
    const { result } = renderHook(() => useSoldKodesQuery(null, "2026-08-01"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSoldKodesAtLocation).not.toHaveBeenCalled();
  });
});

describe("useProduksiInfoQuery", () => {
  it("mengubah batch produksi jadi info per kode", async () => {
    const { result } = renderHook(() => useProduksiInfoQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data["D-01-OSK"]).toEqual({ tanggal: "2026-10-01", punyaWarna: true });
  });
});
