import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("../history/api", () => ({ logHistory: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../produk/api", () => ({ deleteProductCascade: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../produksi-jahit/api", () => ({
  createJahitCardsForBatch: vi.fn().mockResolvedValue([]),
  renameJahitCardsForBatch: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { deleteProductCascade } from "../produk/api";
import { createJahitCardsForBatch, renameJahitCardsForBatch } from "../produksi-jahit/api";
import {
  createBatches,
  deleteBatchAndProduct,
  fetchBatches,
  fetchHppTemplate,
  resyncBahanDipakai,
  updateBatch,
} from "./api";

function makeBase() {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    throwOnError: vi.fn().mockReturnThis(),
  };
}

function makeOrderChain(data = [], error = null) {
  const c = makeBase();
  c.order.mockResolvedValue({ data, error });
  return c;
}

function makeSingleChain(data, error = null) {
  const c = makeBase();
  c.single.mockResolvedValue({ data, error });
  return c;
}

function makeEqChain(data = null, error = null) {
  const c = makeBase();
  c.eq.mockResolvedValue({ data, error });
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
  // Delegasi ke deleteProductCascade() (RPC atomik, sudah dipakai
  // produk-crud) dengan sumber "produksi" supaya history tetap
  // ketandai asalnya — lihat
  // supabase/migrations/20261120_delete_product_cascade_sumber.sql.
  it("memanggil deleteProductCascade dengan kode & sumber produksi", async () => {
    await deleteBatchAndProduct({ kode_produk: "D-01-OSK", nama_produk: "Gamis" });
    expect(deleteProductCascade).toHaveBeenCalledWith("D-01-OSK", "produksi");
  });
});

describe("createBatches", () => {
  // Upsert products + insert produksi_batch + upsert expected_stok
  // sekarang 1 RPC atomik (create_produksi_batch) — lihat
  // supabase/migrations/20261120_produksi_batch_crud.sql. Di sini cuma
  // tes JS-nya manggil RPC dgn field yang benar & meneruskan error.
  it("memanggil create_produksi_batch dengan field yang benar", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "batch-1" }, error: null });
    const entry = {
      kode: "D-01-OSK",
      nama: "Gamis",
      bahan: "OSK",
      activeVariants: [{ size: "Midi", ld: 110, pb: 130 }],
      warnaList: ["HITAM"],
      sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }],
      totalKain: 5,
      template: null,
      batchNo: "PROD-20240101-123",
      tanggal: "2024-01-01",
      catatan: "",
    };
    await createBatches([entry], {});
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_produksi_batch",
      expect.objectContaining({ p_kode: "D-01-OSK", p_batch_no: "PROD-20240101-123" }),
    );
  });

  it("throw kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "gagal simpan batch" } });
    const entry = {
      kode: "D-01-OSK",
      nama: "Gamis",
      bahan: "OSK",
      activeVariants: [],
      warnaList: [],
      sizes: [],
      totalKain: 0,
      template: null,
      batchNo: "PROD-X",
      tanggal: "2024-01-01",
      catatan: "",
    };
    await expect(createBatches([entry], {})).rejects.toThrow("gagal simpan batch");
  });

  it("mengirim upah_jahit, default ke 0 kalau tidak diisi", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "batch-1" }, error: null });
    const entry = {
      kode: "D-01-OSK",
      nama: "Gamis",
      bahan: "OSK",
      activeVariants: [],
      warnaList: [],
      sizes: [],
      totalKain: 0,
      template: null,
      batchNo: "PROD-X",
      tanggal: "2024-01-01",
      catatan: "",
    };
    await createBatches([entry], {});
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_produksi_batch",
      expect.objectContaining({ p_upah_jahit: 0 }),
    );
  });

  it("membuat kartu Jahit dari batch yang baru diinsert (permintaan Denny 2026-09)", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "batch-new-1" }, error: null });
    const sizes = [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }];
    const entry = {
      kode: "D-01-OSK",
      nama: "Gamis",
      bahan: "OSK",
      activeVariants: [{ size: "Midi", ld: 110, pb: 130 }],
      warnaList: ["HITAM"],
      sizes,
      totalKain: 5,
      template: null,
      batchNo: "PROD-20240101-123",
      tanggal: "2024-01-01",
      catatan: "",
    };
    await createBatches([entry], {});
    await Promise.resolve();
    expect(createJahitCardsForBatch).toHaveBeenCalledWith({
      batchId: "batch-new-1",
      kode: "D-01-OSK",
      nama: "Gamis",
      sizes,
    });
  });
});

describe("updateBatch", () => {
  // ensureProductForKode (select+update/insert products) + update
  // produksi_batch + delete/upsert expected_stok sekarang 1 RPC atomik
  // (update_produksi_batch) — clash-detection, rename-vs-insert, dan
  // expected_stok cleanup semuanya sudah diverifikasi langsung di DB
  // (BEGIN/ROLLBACK) saat menulis migrationnya, bukan lagi lewat mock
  // chain supabase.from() di sini. Lihat
  // supabase/migrations/20261120_produksi_batch_crud.sql.
  const basePayload = {
    initial: {
      id: "b1",
      kode_produk: "D-01-OSK",
      batch_no: "PROD-OLD",
      tanggal_produksi: "2024-01-01",
      total_kain: 10,
    },
    kode: "D-01-OSK",
    nama: "Gamis",
    tanggal: "2024-01-15",
    totalKain: 12,
    sizes: [],
    bahanDipakai: [],
    batchNo: "PROD-NEW",
    catatan: "",
  };

  it("memanggil update_produksi_batch dengan field yang benar", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await updateBatch(basePayload, [], {});
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_produksi_batch",
      expect.objectContaining({
        p_batch_id: "b1",
        p_initial_kode: "D-01-OSK",
        p_kode: "D-01-OSK",
        p_batch_no: "PROD-NEW",
      }),
    );
  });

  it("mengirim fallback variants/warna hasil deriveProductFieldsFromSizes", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    const sizes = [{ size: "Midi", warna: [{ warna: "HITAM", qty: 5 }] }];
    await updateBatch({ ...basePayload, sizes }, [], {});
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_produksi_batch",
      expect.objectContaining({
        p_fallback_variants: [{ size: "Midi", harga: 0, ld: 110, pb: 130 }],
        p_fallback_warna: ["HITAM"],
      }),
    );
  });

  it("persists upah_jahit, default ke 0 kalau tidak diisi", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await updateBatch({ ...basePayload, upahJahit: 30000 }, [], {});
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_produksi_batch",
      expect.objectContaining({ p_upah_jahit: 30000 }),
    );

    await updateBatch(basePayload, [], {});
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_produksi_batch",
      expect.objectContaining({ p_upah_jahit: 0 }),
    );
  });

  it("throw kalau RPC gagal (termasuk clash kode), tidak memanggil kartu Jahit", async () => {
    supabase.rpc.mockResolvedValue({
      error: { message: 'Kode produk "D-02-OSK" sudah dipakai produk lain — pilih kode lain.' },
    });
    await expect(updateBatch({ ...basePayload, kode: "D-02-OSK" }, [], {})).rejects.toThrow(
      "sudah dipakai produk lain",
    );
    expect(createJahitCardsForBatch).not.toHaveBeenCalled();
    expect(renameJahitCardsForBatch).not.toHaveBeenCalled();
  });

  it("sinkron kartu Jahit pakai batch_id yang sudah ada (permintaan Denny 2026-09)", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    const sizes = [
      {
        size: "Midi",
        warna: [
          { warna: "HITAM", qty: 5 },
          { warna: "PUTIH", qty: 2 },
        ],
      },
    ];
    await updateBatch({ ...basePayload, sizes }, [], {});
    await Promise.resolve();
    expect(createJahitCardsForBatch).toHaveBeenCalledWith({
      batchId: "b1",
      kode: "D-01-OSK",
      nama: "Gamis",
      sizes,
    });
  });

  it("kode TIDAK berubah -> tidak memanggil renameJahitCardsForBatch", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await updateBatch(basePayload, [], {});
    await Promise.resolve();
    expect(renameJahitCardsForBatch).not.toHaveBeenCalled();
  });

  it("kode BERUBAH -> memanggil renameJahitCardsForBatch dengan kode baru", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await updateBatch({ ...basePayload, kode: "D-02-OSK" }, [], {});
    await Promise.resolve();
    expect(renameJahitCardsForBatch).toHaveBeenCalledWith({
      batchId: "b1",
      kode: "D-02-OSK",
      nama: "Gamis",
    });
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
    supabase.from.mockReturnValue(makeSingleChain(null));
    await expect(resyncBahanDipakai(batch)).rejects.toThrow("belum punya Template HPP");
  });

  it("throws when template ada tapi bahan_items kosong", async () => {
    supabase.from.mockReturnValue(makeSingleChain({ bahan_items: [] }));
    await expect(resyncBahanDipakai(batch)).rejects.toThrow("belum punya Template HPP");
  });

  it("menghitung bahan_dipakai dari template.bahan_items x total_kain, lalu update batch", async () => {
    const tplChain = makeSingleChain({
      total_hpp: 50000,
      bahan_items: [{ nama_bahan: "Wolfis", kode_bahan: "WLF", satuan: "yard", qty_per_baju: 1.5 }],
    });
    const updateChain = makeEqChain();
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
