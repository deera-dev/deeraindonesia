import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  const supabase = {
    from: vi.fn(() => chain),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    _chain: chain,
  };
  return { supabase };
});

import { supabase } from "@deera/shared/lib/supabase";
import { db } from "./db";
import {
  syncProducts, syncStok, applyStokToSupabase, applyStokLocal,
  waitForPendingInsert, flushPendingSales, markSaleDeleted,
  syncSalesForRange, deleteSaleFromSupabase, syncPelanggan, initSync,
} from "./sync";

// Build chain: all methods mockReturnThis, terminal method mockResolvedValue
function makeChain(terminal, result) {
  const c = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  c[terminal] = vi.fn().mockResolvedValue(result);
  return c;
}

// syncProducts: .select().order().order() -- two order calls
function makeDoubleOrderChain(result) {
  const orderMock = vi.fn();
  const c = { select: vi.fn().mockReturnThis(), order: orderMock };
  orderMock.mockReturnValueOnce(c).mockResolvedValueOnce(result);
  return c;
}

beforeEach(async () => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  await db.products.clear();
  await db.stok_warna.clear();
  await db.sales.clear();
  await db.pelanggan.clear();
  localStorage.clear();
});

// syncProducts
describe("syncProducts", () => {
  it("fetches and stores products", async () => {
    const products = [{ kode: "D-01", nama: "Gamis A", created_at: "2026-01-01" }];
    supabase.from.mockReturnValue(makeDoubleOrderChain({ data: products, error: null }));
    const result = await syncProducts();
    expect(result).toEqual(products);
    expect(await db.products.toArray()).toHaveLength(1);
  });

  it("returns [] when data null", async () => {
    supabase.from.mockReturnValue(makeDoubleOrderChain({ data: null, error: null }));
    expect(await syncProducts()).toEqual([]);
  });

  it("throws on supabase error", async () => {
    supabase.from.mockReturnValue(makeDoubleOrderChain({ data: null, error: { message: "fail" } }));
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(syncProducts()).rejects.toMatchObject({ message: "fail" });
    spy.mockRestore();
  });
});

// syncStok
describe("syncStok", () => {
  it("fetches stok_warna and stores atomically", async () => {
    const rows = [{ kode: "D-01", size: "Midi", warna: "HITAM", gudang: 10, cideng: 2, tegalgubug: 0 }];
    supabase.from.mockReturnValue(makeChain("select", { data: rows, error: null }));
    expect(await syncStok()).toEqual(rows);
    expect(await db.stok_warna.toArray()).toHaveLength(1);
  });

  it("returns [] when data null", async () => {
    supabase.from.mockReturnValue(makeChain("select", { data: null, error: null }));
    expect(await syncStok()).toEqual([]);
  });

  it("deduplicates concurrent calls via promise lock", async () => {
    let resolve;
    const slow = new Promise((r) => { resolve = r; });
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue(slow) });
    const p1 = syncStok();
    const p2 = syncStok();
    resolve({ data: [], error: null });
    await Promise.all([p1, p2]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("throws and warns on error", async () => {
    supabase.from.mockReturnValue(makeChain("select", { data: null, error: { message: "stok fail" } }));
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(syncStok()).rejects.toMatchObject({ message: "stok fail" });
    spy.mockRestore();
  });
});

// applyStokToSupabase
describe("applyStokToSupabase", () => {
  it("reads current and updates with delta", async () => {
    supabase.from
      .mockReturnValueOnce(makeChain("single", { data: { gudang: 5 }, error: null }))
      .mockReturnValueOnce(makeChain("eq", { data: null, error: null }));
    await applyStokToSupabase([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -2 }]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("clamps to 0 when delta goes negative", async () => {
    const updateChain = makeChain("eq", { data: null, error: null });
    updateChain.update = vi.fn().mockReturnThis();
    supabase.from
      .mockReturnValueOnce(makeChain("single", { data: { cideng: 1 }, error: null }))
      .mockReturnValueOnce(updateChain);
    await expect(applyStokToSupabase([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: -5 }])).resolves.toBeUndefined();
  });

  it("handles null data (treats as 0)", async () => {
    supabase.from
      .mockReturnValueOnce(makeChain("single", { data: null, error: null }))
      .mockReturnValueOnce(makeChain("eq", { data: null, error: null }));
    await expect(applyStokToSupabase([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: 3 }])).resolves.toBeUndefined();
  });

  it("warns but does not throw on error", async () => {
    const c = makeChain("single", { data: null, error: null });
    c.single = vi.fn().mockRejectedValue(new Error("net error"));
    supabase.from.mockReturnValue(c);
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(applyStokToSupabase([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: 1 }])).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("does nothing for empty array", async () => {
    await expect(applyStokToSupabase([])).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// applyStokLocal
describe("applyStokLocal", () => {
  beforeEach(async () => {
    await db.stok_warna.clear();
    await db.stok_warna.put({ kode: "D-01", size: "Midi", warna: "HITAM", gudang: 10, cideng: 3, tegalgubug: 1 });
  });

  it("updates local stok with delta", async () => {
    await applyStokLocal([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -3 }]);
    expect((await db.stok_warna.get(["D-01", "Midi", "HITAM"])).gudang).toBe(7);
  });

  it("clamps to 0 when delta exceeds current", async () => {
    await applyStokLocal([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -20 }]);
    expect((await db.stok_warna.get(["D-01", "Midi", "HITAM"])).gudang).toBe(0);
  });

  it("does nothing for non-existent row", async () => {
    await expect(applyStokLocal([{ kode: "D-99", size: "Midi", warna: "HITAM", location: "gudang", delta: -1 }])).resolves.toBeUndefined();
  });

  it("warns but does not throw on db error", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dbSpy = vi.spyOn(db.stok_warna, "get").mockRejectedValueOnce(new Error("db fail"));
    await expect(applyStokLocal([{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -1 }])).resolves.toBeUndefined();
    spy.mockRestore();
    dbSpy.mockRestore();
  });

  it("does nothing for empty array", async () => {
    await expect(applyStokLocal([])).resolves.toBeUndefined();
  });

  it("treats missing location field as 0", async () => {
    await db.stok_warna.put({ kode: "D-02", size: "Gamis", warna: "_", gudang: 5 });
    await applyStokLocal([{ kode: "D-02", size: "Gamis", warna: "_", location: "cideng", delta: 2 }]);
    expect((await db.stok_warna.get(["D-02", "Gamis", "_"])).cideng).toBe(2);
  });
});

// waitForPendingInsert
describe("waitForPendingInsert", () => {
  it("returns resolved promise for unknown id", async () => {
    await expect(waitForPendingInsert(9999)).resolves.toBeUndefined();
  });
});

// flushPendingSales
describe("flushPendingSales", () => {
  it("returns synced:0 errors:0 when no pending", async () => {
    expect(await flushPendingSales()).toEqual({ synced: 0, errors: 0 });
  });

  it("syncs a pending sale and updates local status", async () => {
    const saleId = await db.sales.add({ status: "pending", date: "2026-07-01", created_at: new Date().toISOString(), stok_adjustments: [] });
    const insertChain = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "sup-1" }, error: null }) };
    supabase.from.mockReturnValue(insertChain);
    const result = await flushPendingSales();
    expect(result.synced).toBe(1);
    expect((await db.sales.get(saleId)).status).toBe("synced");
  });

  it("applies stok adjustments when present", async () => {
    await db.sales.add({ status: "pending", date: "2026-07-01", created_at: new Date().toISOString(), stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -1 }] });
    const insertChain = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "sup-2" }, error: null }) };
    supabase.from
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(makeChain("single", { data: { gudang: 5 }, error: null }))
      .mockReturnValueOnce(makeChain("eq", { data: null, error: null }));
    expect((await flushPendingSales()).synced).toBe(1);
  });

  it("records error status on insert failure", async () => {
    const saleId = await db.sales.add({ status: "pending", date: "2026-07-01", created_at: new Date().toISOString(), stok_adjustments: [] });
    const insertChain = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert fail" } }) };
    supabase.from.mockReturnValue(insertChain);
    const result = await flushPendingSales();
    expect(result.errors).toBe(1);
    expect((await db.sales.get(saleId)).status).toBe("error");
  });
});

// markSaleDeleted
describe("markSaleDeleted", () => {
  it("does nothing for falsy id", () => {
    expect(() => markSaleDeleted(null)).not.toThrow();
    expect(() => markSaleDeleted(undefined)).not.toThrow();
  });

  it("adds id to localStorage", () => {
    markSaleDeleted("sup-del-1");
    expect(localStorage.getItem("deera_deleted_sale_ids")).toContain("sup-del-1");
  });
});

// syncSalesForRange
describe("syncSalesForRange", () => {
  it("returns early when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    await expect(syncSalesForRange("2026-07-01", "2026-07-01", "a@b.com")).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("adds new remote sales when from===to", async () => {
    supabase.from.mockReturnValue(makeChain("eq", { data: [{ id: "sup-r1", date: "2026-07-04" }], error: null }));
    await syncSalesForRange("2026-07-04", "2026-07-04", "a@b.com");
    expect(await db.sales.where("supabase_id").equals("sup-r1").first()).toBeDefined();
  });

  it("uses gte/lte when from!==to", async () => {
    const c = makeChain("lte", { data: [], error: null });
    supabase.from.mockReturnValue(c);
    await syncSalesForRange("2026-07-01", "2026-07-04", "a@b.com");
    expect(c.gte).toHaveBeenCalledWith("date", "2026-07-01");
  });

  it("skips sale in deletedIds", async () => {
    markSaleDeleted("sup-skip-1");
    supabase.from.mockReturnValue(makeChain("eq", { data: [{ id: "sup-skip-1", date: "2026-07-04" }], error: null }));
    await syncSalesForRange("2026-07-04", "2026-07-04", "a@b.com");
    expect(await db.sales.where("supabase_id").equals("sup-skip-1").first()).toBeUndefined();
  });

  it("skips sale already in local db", async () => {
    await db.sales.add({ status: "synced", supabase_id: "sup-dup", date: "2026-07-04", created_at: new Date().toISOString() });
    supabase.from.mockReturnValue(makeChain("eq", { data: [{ id: "sup-dup", date: "2026-07-04" }], error: null }));
    await syncSalesForRange("2026-07-04", "2026-07-04", "a@b.com");
    expect(await db.sales.where("supabase_id").equals("sup-dup").toArray()).toHaveLength(1);
  });

  it("deletes local sale gone from supabase", async () => {
    const localId = await db.sales.add({ status: "synced", supabase_id: "sup-gone", date: "2026-07-04", created_at: new Date().toISOString() });
    supabase.from.mockReturnValue(makeChain("eq", { data: [], error: null }));
    await syncSalesForRange("2026-07-04", "2026-07-04", "a@b.com");
    expect(await db.sales.get(localId)).toBeUndefined();
  });

  it("returns early when data null or error", async () => {
    supabase.from.mockReturnValue(makeChain("eq", { data: null, error: { message: "fail" } }));
    await expect(syncSalesForRange("2026-07-04", "2026-07-04", "a@b.com")).resolves.toBeUndefined();
  });

  it("warns but does not throw on exception", async () => {
    supabase.from.mockReturnValue({ eq: vi.fn().mockRejectedValue(new Error("crash")) });
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(syncSalesForRange("2026-07-04", "2026-07-04", "a@b.com")).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

// deleteSaleFromSupabase
describe("deleteSaleFromSupabase", () => {
  it("throws when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    await expect(deleteSaleFromSupabase({ supabase_id: "sup-1" })).rejects.toThrow("koneksi");
  });

  it("deletes successfully returning 1 row", async () => {
    const c = makeChain("select", { data: [{ id: "sup-1" }], error: null });
    c.delete = vi.fn().mockReturnThis();
    supabase.from.mockReturnValue(c);
    await expect(deleteSaleFromSupabase({ supabase_id: "sup-1", stok_adjustments: [] })).resolves.toBeUndefined();
  });

  it("throws when supabase returns error", async () => {
    const c = makeChain("select", { data: null, error: { message: "rls denied" } });
    c.delete = vi.fn().mockReturnThis();
    supabase.from.mockReturnValue(c);
    await expect(deleteSaleFromSupabase({ supabase_id: "sup-1", stok_adjustments: [] })).rejects.toThrow("rls denied");
  });

  it("throws when 0 rows deleted", async () => {
    const c = makeChain("select", { data: [], error: null });
    c.delete = vi.fn().mockReturnThis();
    supabase.from.mockReturnValue(c);
    await expect(deleteSaleFromSupabase({ supabase_id: "sup-1", stok_adjustments: [] })).rejects.toThrow("0 baris");
  });

  it("skips supabase call when no supabase_id", async () => {
    await expect(deleteSaleFromSupabase({ supabase_id: null, stok_adjustments: [] })).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("reverses stok after delete", async () => {
    const c = makeChain("select", { data: [{ id: "sup-2" }], error: null });
    c.delete = vi.fn().mockReturnThis();
    supabase.from
      .mockReturnValueOnce(c)
      .mockReturnValueOnce(makeChain("single", { data: { gudang: 5 }, error: null }))
      .mockReturnValueOnce(makeChain("eq", { data: null, error: null }));
    await deleteSaleFromSupabase({ supabase_id: "sup-2", stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -2 }] });
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
});

// syncPelanggan
describe("syncPelanggan", () => {
  it("fetches and stores pelanggan", async () => {
    const pelanggan = [{ id: "p1", nama: "Budi", no_hp: "081", updated_at: "2026-01-01" }];
    supabase.from.mockReturnValue(makeChain("order", { data: pelanggan, error: null }));
    expect(await syncPelanggan()).toEqual(pelanggan);
    expect(await db.pelanggan.toArray()).toHaveLength(1);
  });

  it("returns [] when data null", async () => {
    supabase.from.mockReturnValue(makeChain("order", { data: null, error: null }));
    expect(await syncPelanggan()).toEqual([]);
  });

  it("warns and returns [] on error", async () => {
    supabase.from.mockReturnValue(makeChain("order", { data: null, error: { message: "pel fail" } }));
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await syncPelanggan()).toEqual([]);
    spy.mockRestore();
  });
});

// initSync
describe("initSync", () => {
  it("returns early when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    await expect(initSync()).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("calls syncProducts syncStok syncPelanggan and flushPendingSales", async () => {
    supabase.from
      .mockReturnValueOnce(makeDoubleOrderChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain("select", { data: [], error: null }))
      .mockReturnValueOnce(makeChain("order", { data: [], error: null }));
    await initSync();
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
});
