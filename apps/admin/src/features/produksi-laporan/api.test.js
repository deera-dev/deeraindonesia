import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchProduksiBatches, fetchTagihanJatuhTempo, fetchProduksiBatchesTotal } from "./api";

// Terminal for fetchTagihanJatuhTempo queries: .select().eq().gte().lte().order()
function makeOrderChain(data = [], error = null) {
  const c = {
    select: vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data, error }),
  };
  return c;
}

beforeEach(() => vi.clearAllMocks());

// fetchProduksiBatches() sekarang memanggil RPC Postgres
// `get_laporan_produksi` (Migration Phase 1) yang langsung mengembalikan
// OBJECT siap tampil { batches, ringkasan, bahanUsage } — enrichment
// hpp_per_item/bahan_dipakai/harga_jual per batch, SUM/COUNT/AVG ringkasan,
// dan GROUP BY pemakaian bahan semuanya sudah dihitung di database. Fungsi
// ini TIDAK LAGI mengembalikan array baris mentah maupun melakukan query
// berurutan ke produksi_batch/hpp_template/products — test lama yang
// menguji enrichment manual (3-query chain) digantikan seluruhnya oleh
// test kontrak RPC berikut.
describe("fetchProduksiBatches", () => {
  it("memanggil rpc('get_laporan_produksi') dengan p_from_date & p_to_date", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { batches: [], ringkasan: {}, bahanUsage: [] },
      error: null,
    });

    await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(supabase.rpc).toHaveBeenCalledWith("get_laporan_produksi", {
      p_from_date: "2024-01-01",
      p_to_date: "2024-01-31",
    });
  });

  it("meneruskan object hasil RPC (batches, ringkasan, bahanUsage) apa adanya", async () => {
    const rpcResult = {
      batches: [
        { id: "b1", kode_produk: "D-07-OSK", total_kain: 5, hpp_per_item: 85000, modal: 425000, bahan_dipakai: [{ nama_bahan: "Wolfis", satuan: "yard", jumlah: 5 }], harga_jual: 300000 },
      ],
      ringkasan: { totalBatch: 1, totalBaju: 5, totalModal: 425000, hppAvg: 85000, hargaJualAvg: 300000 },
      bahanUsage: [{ nama: "Wolfis", satuan: "yard", jumlah: 5 }],
    };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });

  it("data null (tanpa error) -> fallback ke object kosong", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual({ batches: [], ringkasan: {}, bahanUsage: [] });
  });

  it("RPC error -> tetap fallback ke object kosong TANPA melempar (meniru versi lama yang tidak cek error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(
      fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" }),
    ).resolves.toEqual({ batches: [], ringkasan: {}, bahanUsage: [] });
  });

  it("tidak melakukan reduce/map/business logic apa pun terhadap hasil RPC", async () => {
    // Bukti bahwa fungsi murni pass-through: field asing dari RPC pun
    // tetap diteruskan apa adanya, tanpa transformasi/filtering di JS.
    const rpcResult = { batches: [{ id: "x" }], ringkasan: { totalBatch: 1 }, bahanUsage: [], extraField: "abc" };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });

    expect(result).toEqual(rpcResult);
  });
});

// fetchProduksiBatchesTotal sekarang memanggil RPC Postgres
// `get_produksi_batches_total` (Migration Phase 1, REVISI arsitektur)
// yang langsung mengembalikan OBJECT statistik teragregasi
// ({totalBatch, totalBaju, totalModal}) — SUM/COUNT/fallback HPP
// (effective_hpp) semuanya sudah dihitung di database. Fungsi ini
// TIDAK LAGI mengembalikan array baris mentah (kontrak berubah dari
// revisi pertama migration ini) — test lama yang menguji bentuk array
// digantikan seluruhnya oleh test kontrak object berikut.
describe("fetchProduksiBatchesTotal", () => {
  it("memanggil rpc('get_produksi_batches_total') tanpa parameter", async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { totalBatch: 0, totalBaju: 0, totalModal: 0 },
      error: null,
    });

    await fetchProduksiBatchesTotal();

    expect(supabase.rpc).toHaveBeenCalledWith("get_produksi_batches_total");
  });

  it("meneruskan object hasil agregasi RPC apa adanya", async () => {
    const rpcResult = { totalBatch: 24, totalBaju: 120, totalModal: 10200000 };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchProduksiBatchesTotal();

    expect(result).toEqual(rpcResult);
  });

  it("data null (tanpa error) -> fallback ke object nol", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchProduksiBatchesTotal();

    expect(result).toEqual({ totalBatch: 0, totalBaju: 0, totalModal: 0 });
  });

  it("RPC error -> tetap fallback ke object nol TANPA melempar (meniru versi lama yang tidak cek error)", async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("rpc gagal") });

    await expect(fetchProduksiBatchesTotal()).resolves.toEqual({
      totalBatch: 0,
      totalBaju: 0,
      totalModal: 0,
    });
  });

  it("tidak melakukan reduce/map/business logic apa pun terhadap hasil RPC", async () => {
    // Bukti bahwa fungsi murni pass-through: field asing dari RPC pun
    // tetap diteruskan apa adanya, tanpa transformasi/filtering di JS.
    const rpcResult = { totalBatch: 1, totalBaju: 2, totalModal: 3, extraField: "abc" };
    supabase.rpc.mockResolvedValueOnce({ data: rpcResult, error: null });

    const result = await fetchProduksiBatchesTotal();

    expect(result).toEqual(rpcResult);
  });
});

describe("fetchTagihanJatuhTempo", () => {
  it("merges beli and pinjam with _type label", async () => {
    const beliChain = makeOrderChain([{ id: "beli1", nama_bahan: "Wolfis", total_harga: 50000, jatuh_tempo: "2024-01-20" }]);
    const pinjamChain = makeOrderChain([{ id: "pj1", nama_bahan: "Sifon", total_harga: 30000, jatuh_tempo: "2024-01-15" }]);
    supabase.from
      .mockReturnValueOnce(beliChain)
      .mockReturnValueOnce(pinjamChain);
    const result = await fetchTagihanJatuhTempo({ fromDate: "2024-01-01", toDate: "2024-01-31" });
    expect(result).toHaveLength(2);
    const types = result.map((r) => r._type);
    expect(types).toContain("beli");
    expect(types).toContain("pinjam");
  });

  it("sorts by jatuh_tempo ascending", async () => {
    const beliChain = makeOrderChain([{ id: "b1", nama_bahan: "Wolfis", total_harga: 0, jatuh_tempo: "2024-01-25" }]);
    const pinjamChain = makeOrderChain([{ id: "p1", nama_bahan: "Sifon", total_harga: 0, jatuh_tempo: "2024-01-10" }]);
    supabase.from
      .mockReturnValueOnce(beliChain)
      .mockReturnValueOnce(pinjamChain);
    const result = await fetchTagihanJatuhTempo({ ffromDate: "2024-01-01", toDate: "2024-01-31" });
    expect(result[0].jatuh_tempo).toBe("2024-01-10");
    expect(result[1].jatuh_tempo).toBe("2024-01-25");
  });
});
