import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("../history/api", () => ({ logHistory: vi.fn().mockResolvedValue(undefined) }));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchBatches, fetchHppTemplate, deleteBatchAndProduct, createBatches, updateBatch, resyncBahanDipakai } from "./api";

// Base chain — all methods mockReturnThis by default
function makeBase() {
  return {
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    throwOnError: vi.fn().mockReturnThis(),
  };
}

// Terminal: order()  — fetchBatches
function makeOrderChain(data = [], error = null) {
  const c = makeBase();
  c.order.mockResolvedValue({ data, error });
  return c;
}

// Terminal: single() — fetchHppTemplate (eq stays mockReturnThis so single() is reachable)
function makeSingleChain(data, error = null) {
  const c = makeBase();
  c.single.mockResolvedValue({ data, error });
  return c;
}

// Terminal: eq() — delete / update chains
function makeEqChain(data = null, error = null) {
  const c = makeBase();
  c.eq.mockResolvedValue({ data, error });
  return c;
}

// Terminal: upsert() / insert() — createBatches
function makeUpsertChain(data = null, error = null) {
  const c = makeBase();
  c.upsert.mockResolvedValue({ data, error });
  c.insert.mockResolvedValue({ data, error });
  return c;
}

beforeEach(() => vi.clearAllMocks());

describe("fetchBatches", () => {
  it("returns data", async () => {
    supabase.from.mockReturnValue(makeOrderChain([{ id: "b1" }]));
    expect(await fetchBatches()).toEqual([{ id: "b1" }]);
  });
  it("returns [] on null", async () => {
    supabase.from.mockReturnValue(makeOrderChain(null));
    expect(await fetchBatches()).toEqual([]);
  });
});

describe("fetchHppTemplate", () => {
  it("returns null for null kode", async () => {
    expect(await fetchHppTemplate(null)).toBeNull();
  });
  it("fetches by kode_produk", async () => {
    supabase.from.mockReturnValue(makeSingleChain({ id: "t1" }));
    expect(await fetchHppTemplate("D-01-OSK")).toEqual({ id: "t1" });
  });
  it("returns null when data null", async () => {
    supabase.from.mockReturnValue(makeSingleChain(null));
    expect(await fetchHppTemplate("D-01-OSK")).toBeNull();
  });
});

describe("deleteBatchAndProduct", () => {
  it("calls delete on multiple tables", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    await deleteBatchAndProduct({ kode_produk: "D-01-OSK", nama_produk: "Gamis" });
    expect(supabase.from).toHaveBeenCalledWith("produksi_batch");
    expect(supabase.from).toHaveBeenCalledWith("products");
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe("createBatches", () => {
  it("upserts products and inserts batch for each entry", async () => {
    const chain = makeUpsertChain();
    supabase.from.mockReturnValue(chain);
    const entry = {
      kode: "D-01-OSK", nama: "Gamis", bahan: "OSK",
      activeVariants: [{ size: "Midi", ld: 110, pb: 130 }],
      warnaList: ["HITAM"],
      sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }],
      totalKain: 5, template: null, batchNo: "PROD-20240101-123",
      tanggal: "2024-01-01", catatan: "",
    };
    await createBatches([entry], {});
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("throws when products upsert errors", async () => {
    const chain = makeUpsertChain(null, null);
    chain.upsert.mockResolvedValue({ error: new Error("upsert fail") });
    supabase.from.mockReturnValue(chain);
    const entry = {
      kode: "D-01-OSK", nama: "Gamis", bahan: "OSK",
      activeVariants: [], warnaList: [],
      sizes: [], totalKain: 0, template: null,
      batchNo: "PROD-X", tanggal: "2024-01-01", catatan: "",
    };
    await expect(createBatches([entry], {})).rejects.toThrow("upsert fail");
  });

  it("inserts upah_jahit into produksi_batch", async () => {
    const chain = makeUpsertChain();
    supabase.from.mockReturnValue(chain);
    const entry = {
      kode: "D-01-OSK", nama: "Gamis", bahan: "OSK",
      activeVariants: [{ size: "Midi", ld: 110, pb: 130 }],
      warnaList: ["HITAM"],
      sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }],
      totalKain: 5, template: null, batchNo: "PROD-20240101-123",
      tanggal: "2024-01-01", catatan: "", upahJahit: 25000,
    };
    await createBatches([entry], {});
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ upah_jahit: 25000 }),
    );
  });

  it("defaults upah_jahit to 0 when not provided", async () => {
    const chain = makeUpsertChain();
    supabase.from.mockReturnValue(chain);
    const entry = {
      kode: "D-01-OSK", nama: "Gamis", bahan: "OSK",
      activeVariants: [], warnaList: [],
      sizes: [], totalKain: 0, template: null,
      batchNo: "PROD-X", tanggal: "2024-01-01", catatan: "",
    };
    await createBatches([entry], {});
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ upah_jahit: 0 }),
    );
  });
});

describe("updateBatch", () => {
  it("calls update on produksi_batch", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    const payload = {
      initial: { id: "b1", kode_produk: "D-01-OSK", batch_no: "PROD-OLD", tanggal_produksi: "2024-01-01", total_kain: 10 },
      kode: "D-01-OSK", nama: "Gamis", tanggal: "2024-01-15",
      totalKain: 12, sizes: [], bahanDipakai: [], batchNo: "PROD-NEW", catatan: "",
    };
    await updateBatch(payload, [], {});
    expect(chain.update).toHaveBeenCalled();
  });

  it("persists upah_jahit in the update payload", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    const payload = {
      initial: { id: "b1", kode_produk: "D-01-OSK", batch_no: "PROD-OLD", tanggal_produksi: "2024-01-01", total_kain: 10 },
      kode: "D-01-OSK", nama: "Gamis", tanggal: "2024-01-15",
      totalKain: 12, sizes: [], bahanDipakai: [], batchNo: "PROD-NEW", catatan: "",
      upahJahit: 30000,
    };
    await updateBatch(payload, [], {});
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ upah_jahit: 30000 }),
    );
  });

  it("defaults upah_jahit to 0 when not provided", async () => {
    const chain = makeEqChain();
    supabase.from.mockReturnValue(chain);
    const payload = {
      initial: { id: "b1", kode_produk: "D-01-OSK", batch_no: "PROD-OLD", tanggal_produksi: "2024-01-01", total_kain: 10 },
      kode: "D-01-OSK", nama: "Gamis", tanggal: "2024-01-15",
      totalKain: 12, sizes: [], bahanDipakai: [], batchNo: "PROD-NEW", catatan: "",
    };
    await updateBatch(payload, [], {});
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ upah_jahit: 0 }),
    );
  });
});

describe("resyncBahanDipakai", () => {
  const batch = {
    id: "b1",
    kode_produk: "D-01-OSK",
    nama_produk: "Gamis",
    batch_no: "PROD-20240101-111",
    total_kain: 10,
    hpp_per_item: 0,
    hpp_snapshot: null,
  };

  it("throws when template tidak ditemukan (bahan_items kosong/null)", async () => {
    supabase.from.mockReturnValue(makeSingleChain(null)); // fetchHppTemplate -> null
    await expect(resyncBahanDipakai(batch)).rejects.toThrow("belum punya Template HPP");
  });

  it("throws when template ada tapi bahan_items kosong", async () => {
    supabase.from.mockReturnValue(makeSingleChain({ bahan_items: [] }));
    await expect(resyncBahanDipakai(batch)).rejects.toThrow("belum punya Template HPP");
  });

  it("menghitung bahan_dipakai dari template.bahan_items x total_kain, lalu update batch", async () => {
    const tplChain = makeSingleChain({
      total_hpp: 50000,
      bahan_items: [
        { nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", qty_per_baju: 1.5 },
      ],
    });
    const updateChain = makeEqChain();
    // Panggilan pertama ke supabase.from("hpp_template") -> tplChain
    // Panggilan kedua ke supabase.from("produksi_batch") -> updateChain
    supabase.from.mockImplementation((table) =>
      table === "hpp_template" ? tplChain : updateChain,
    );

    const result = await resyncBahanDipakai(batch);

    expect(result).toEqual([
      { nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", jumlah: 15 },
    ]);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        bahan_dipakai: [{ nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", jumlah: 15 }],
      }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", "b1");
  });

  it("tidak menimpa hpp_snapshot yang sudah ada", async () => {
    const existingSnapshot = { total_hpp: 40000, bahan_items: [] };
    const batchWithSnapshot = { ...batch, hpp_snapshot: existingSnapshot };
    const tplChain = makeSingleChain({
      total_hpp: 50000,
      bahan_items: [{ nama_bahan: "Wolfis", satuan: "yard", qty_per_baju: 1 }],
    });
    const updateChain = makeEqChain();
    supabase.from.mockImplementation((table) =>
      table === "hpp_template" ? tplChain : updateChain,
    );

    await resyncBahanDipakai(batchWithSnapshot);

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ hpp_snapshot: existingSnapshot }),
    );
  });

  it("mempertahankan hpp_per_item yang sudah > 0, tidak menimpa dengan template.total_hpp", async () => {
    const batchWithHpp = { ...batch, hpp_per_item: 75000 };
    const tplChain = makeSingleChain({
      total_hpp: 50000,
      bahan_items: [{ nama_bahan: "Wolfis", satuan: "yard", qty_per_baju: 1 }],
    });
    const updateChain = makeEqChain();
    supabase.from.mockImplementation((table) =>
      table === "hpp_template" ? tplChain : updateChain,
    );

    await resyncBahanDipakai(batchWithHpp);

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ hpp_per_item: 75000 }),
    );
  });

  it("throws saat update produksi_batch gagal", async () => {
    const tplChain = makeSingleChain({
      total_hpp: 50000,
      bahan_items: [{ nama_bahan: "Wolfis", satuan: "yard", qty_per_baju: 1 }],
    });
    const updateChain = makeEqChain(null, new Error("update gagal"));
    supabase.from.mockImplementation((table) =>
      table === "hpp_template" ? tplChain : updateChain,
    );

    await expect(resyncBahanDipakai(batch)).rejects.toThrow("update gagal");
  });
});
