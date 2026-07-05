import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchProduksiBatches, fetchTagihanJatuhTempo } from "./api";

// Terminal for main date-range queries: .select().gte().lte().order()
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

// Terminal for kodes lookup: .select().in()
function makeInChain(data = [], error = null) {
  const c = {
    select: vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockResolvedValue({ data, error }),
    order:  vi.fn().mockReturnThis(),
  };
  return c;
}

beforeEach(() => vi.clearAllMocks());

describe("fetchProduksiBatches", () => {
  it("returns enriched batches with hpp from template when missing, and harga_jual from products", async () => {
    const batchChain = makeOrderChain([
      { id: "b1", kode_produk: "D-07-OSK", total_kain: 5, hpp_per_item: 0, bahan_dipakai: null, tanggal_produksi: "2024-01-10" },
    ]);
    const tplChain = makeInChain([
      { kode_produk: "D-07-OSK", total_hpp: 85000, bahan_items: [{ nama_bahan: "Wolfis", qty_per_baju: 1, satuan: "yard", kode_bahan: "WLF" }] },
    ]);
    const prodChain = makeInChain([
      { kode: "D-07-OSK", variants: [{ harga: 280000 }, { harga: 320000 }] },
    ]);
    supabase.from
      .mockReturnValueOnce(batchChain)  // produksi_batch
      .mockReturnValueOnce(tplChain)    // hpp_template
      .mockReturnValueOnce(prodChain);  // products (harga_jual)
    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });
    expect(result).toHaveLength(1);
    expect(result[0].hpp_per_item).toBe(85000);
    expect(result[0].bahan_dipakai.length).toBeGreaterThan(0);
    expect(result[0].harga_jual).toBe(300000); // avg of 280000 + 320000
  });

  it("skips template fetch when no batches need it", async () => {
    const batchChain = makeOrderChain([
      { id: "b1", kode_produk: "D-07-OSK", total_kain: 5, hpp_per_item: 90000, bahan_dipakai: [{ nama_bahan: "Wolfis", jumlah: 5, satuan: "yard" }] },
    ]);
    supabase.from.mockReturnValue(batchChain);
    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });
    expect(result[0].hpp_per_item).toBe(90000);
  });

  it("returns [] when data is null", async () => {
    const chain = makeOrderChain(null);
    supabase.from.mockReturnValue(chain);
    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });
    expect(result).toEqual([]);
  });

  it("uses existing bahan_dipakai when present", async () => {
    const bahan = [{ nama_bahan: "Sifon", jumlah: 3, satuan: "yard" }];
    const batchChain = makeOrderChain([
      { id: "b1", kode_produk: "D-01-SFN", total_kain: 3, hpp_per_item: 0, bahan_dipakai: bahan },
    ]);
    const tplChain = makeInChain([{ kode_produk: "D-01-SFN", total_hpp: 70000, bahan_items: [] }]);
    const prodChain = makeInChain([]); // products — kosong, tidak ada harga jual
    supabase.from
      .mockReturnValueOnce(batchChain)
      .mockReturnValueOnce(tplChain)
      .mockReturnValueOnce(prodChain);
    const result = await fetchProduksiBatches({ fromDate: "2024-01-01", toDate: "2024-01-31" });
    // bahan_dipakai kept from batch (has items), hpp_per_item from template
    expect(result[0].bahan_dipakai).toEqual(bahan);
    expect(result[0].hpp_per_item).toBe(70000);
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
    const result = await fetchTagihanJatuhTempo({ fromDate: "2024-01-01", toDate: "2024-01-31" });
    expect(result[0].jatuh_tempo).toBe("2024-01-10");
  });

});
