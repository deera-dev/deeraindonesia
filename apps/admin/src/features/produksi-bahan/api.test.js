import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase and history before importing api
vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import {
  fetchBahanItems, saveBahanItem, toggleLunas, deleteBahanItem,
  fetchStokBahan, detectDupes, mergeDupeGroups,
} from "./api";

function makeChain(returnVal = { data: [], error: null }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    throwOnError: vi.fn().mockResolvedValue(returnVal),
  };
  // Allow terminal await (e.g. await supabase.from(...).select(...).order(...))
  chain.order.mockResolvedValue(returnVal);

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchBahanItems", () => {
  it("returns data from supabase table", async () => {
    const chain = makeChain({ data: [{ id: 1, nama_bahan: "Wolfis" }] });
    supabase.from.mockReturnValue(chain);
    const result = await fetchBahanItems("bahan_pembelian");
    expect(supabase.from).toHaveBeenCalledWith("bahan_pembelian");
    expect(result).toEqual([{ id: 1, nama_bahan: "Wolfis" }]);
  });
  it("returns [] when data is null", async () => {
    const chain = makeChain({ data: null });
    supabase.from.mockReturnValue(chain);
    const result = await fetchBahanItems("bahan_pembelian");
    expect(result).toEqual([]);
  });
});

describe("saveBahanItem — single insert", () => {
  it("inserts a new row when editing is null", async () => {
    const chain = makeChain();
    supabase.from.mockReturnValue(chain);
    await saveBahanItem({
      table: "bahan_pembelian",
      payload: { nama_bahan: "Wolfis", jumlah: 5 },
      editing: null,
      meta: { created_by: "admin@deera.id" },
      activeTab: "pembelian",
    });
    expect(chain.insert).toHaveBeenCalled();
  });
  it("updates existing row when editing is provided", async () => {
    const chain = makeChain();
    supabase.from.mockReturnValue(chain);
    await saveBahanItem({
      table: "bahan_pembelian",
      payload: { nama_bahan: "Wolfis Updated" },
      editing: { id: "abc", nama_bahan: "Wolfis" },
      meta: {},
      activeTab: "pembelian",
    });
    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "abc");
  });
  it("uses bahan-pinjam action for pinjam tab", async () => {
    const { logHistory } = await import("../history/api");
    const chain = makeChain();
    supabase.from.mockReturnValue(chain);
    await saveBahanItem({
      table: "bahan_pinjam",
      payload: { nama_bahan: "Sifon", kode_bahan: "SFN" },
      editing: null,
      meta: {},
      activeTab: "pinjam",
    });
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "bahan-pinjam" }));
  });
});

describe("saveBahanItem — bulk insert (array payload)", () => {
  it("inserts multiple rows when payload is array", async () => {
    const chain = makeChain();
    supabase.from.mockReturnValue(chain);
    await saveBahanItem({
      table: "bahan_pembelian",
      payload: [
        { nama_bahan: "Wolfis", jumlah: 5 },
        { nama_bahan: "Sifon", jumlah: 3 },
      ],
      editing: null,
      meta: { created_by: "admin@deera.id" },
      activeTab: "pembelian",
    });
    expect(chain.insert).toHaveBeenCalled();
    const insertArg = chain.insert.mock.calls[0][0];
    expect(Array.isArray(insertArg)).toBe(true);
    expect(insertArg).toHaveLength(2);
  });
});

describe("toggleLunas", () => {
  it("toggles belum → lunas", async () => {
    const chain = makeChain({ data: null });
    supabase.from.mockReturnValue(chain);
    const result = await toggleLunas("bahan_pembelian", { id: "x", status_bayar: "belum" });
    expect(result).toBe("lunas");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status_bayar: "lunas" }));
  });
  it("toggles lunas → belum", async () => {
    const chain = makeChain({ data: null });
    supabase.from.mockReturnValue(chain);
    const result = await toggleLunas("bahan_pembelian", { id: "x", status_bayar: "lunas" });
    expect(result).toBe("belum");
  });
});

describe("deleteBahanItem", () => {
  it("deletes by item id and logs history", async () => {
    const { logHistory } = await import("../history/api");
    const chain = makeChain();
    supabase.from.mockReturnValue(chain);
    await deleteBahanItem({
      table: "bahan_pembelian",
      item: { id: "z", nama_bahan: "Wolfis", kode_bahan: "WLF" },
      activeTab: "pembelian",
    });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "z");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "bahan-hapus" }));
  });
});

describe("fetchStokBahan", () => {
  it("returns stok data ordered by nama_bahan", async () => {
    const chain = makeChain({ data: [{ nama_bahan: "Wolfis", stok_sisa: 10 }] });
    supabase.from.mockReturnValue(chain);
    const result = await fetchStokBahan();
    expect(supabase.from).toHaveBeenCalledWith("v_stok_bahan");
    expect(result).toHaveLength(1);
  });
  it("returns [] on null data", async () => {
    const chain = makeChain({ data: null });
    supabase.from.mockReturnValue(chain);
    expect(await fetchStokBahan()).toEqual([]);
  });
});

describe("detectDupes", () => {
  it("returns empty array on error", async () => {
    const chain = makeChain({ error: new Error("fail"), data: null });
    supabase.from.mockReturnValue(chain);
    const result = await detectDupes("bahan_pembelian");
    expect(result).toEqual([]);
  });
  it("returns groups of duplicates by key", async () => {
    const rows = [
      { id: 1, nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", tanggal: "2024-01-10", jumlah: 5, total_harga: 50000 },
      { id: 2, nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", tanggal: "2024-01-10", jumlah: 3, total_harga: 30000 },
      { id: 3, nama_bahan: "Sifon",  kode_bahan: "",    satuan: "yard", tanggal: "2024-01-10", jumlah: 2, total_harga: 20000 },
    ];
    const chain = makeChain({ data: rows });
    supabase.from.mockReturnValue(chain);
    const dupes = await detectDupes("bahan_pembelian");
    expect(dupes).toHaveLength(1);
    expect(dupes[0]).toHaveLength(2);
  });
  it("returns empty array when no duplicates", async () => {
    const rows = [
      { id: 1, nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", tanggal: "2024-01-10" },
      { id: 2, nama_bahan: "Sifon",  kode_bahan: "SFN", satuan: "yard", tanggal: "2024-01-11" },
    ];
    const chain = makeChain({ data: rows });
    supabase.from.mockReturnValue(chain);
    expect(await detectDupes("bahan_pembelian")).toEqual([]);
  });
});

describe("mergeDupeGroups", () => {
  it("updates master and deletes rest, returns 0 errors", async () => {
    const chain = makeChain({ error: null });
    supabase.from.mockReturnValue(chain);
    const groups = [
      [
        { id: "aaa", jumlah: 5, total_harga: 50000 },
        { id: "bbb", jumlah: 3, total_harga: 30000 },
      ],
    ];
    const errors = await mergeDupeGroups("bahan_pembelian", groups);
    expect(errors).toBe(0);
    expect(chain.update).toHaveBeenCalled();
    expect(chain.delete).toHaveBeenCalled();
  });
  it("counts errors when update fails", async () => {
    const chain = makeChain({ error: new Error("fail"), data: null });
    supabase.from.mockReturnValue(chain);
    // update returns error
    chain.eq.mockResolvedValue({ error: new Error("fail") });
    const result = await mergeDupeGroups("bahan_pembelian", [[{ id: "a" }, { id: "b" }]]);
    expect(result).toBeGreaterThan(0);
  });
});
