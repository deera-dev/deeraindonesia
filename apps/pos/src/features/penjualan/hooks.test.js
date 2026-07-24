import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(),
  displayName: vi.fn((u) => u?.email ?? "Unknown"),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  getMarketLocation: vi.fn(() => "gudang"),
}));
vi.mock("../../lib/db", () => {
  const storeMock = () => ({
    add: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    between: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    sortBy: vi.fn().mockResolvedValue([]),
  });
  return { db: { sales: storeMock() } };
});
vi.mock("../../lib/sync", () => ({
  applyStokLocal: vi.fn().mockResolvedValue(undefined),
  applyStokToSupabase: vi.fn().mockResolvedValue(undefined),
  deleteSaleFromSupabase: vi.fn().mockResolvedValue(undefined),
  syncSalesForRange: vi.fn().mockResolvedValue(undefined),
  markSaleDeleted: vi.fn(),
  waitForPendingInsert: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { useAuth, displayName } from "@deera/shared/features/auth/hooks";
import { db } from "../../lib/db";
import { applyStokLocal, applyStokToSupabase, deleteSaleFromSupabase, markSaleDeleted } from "../../lib/sync";
import { useSalesReport, useCreateSale, useCreateRetur, useUpdateSale, useDeleteSale } from "./hooks";

const mockUser = { email: "kasir@test.com" };

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  useAuth.mockReturnValue({ user: mockUser });
  displayName.mockReturnValue("kasir@test.com");

  db.sales.add.mockResolvedValue(1);
  db.sales.get.mockResolvedValue(undefined);
  db.sales.update.mockResolvedValue(1);
  db.sales.delete.mockResolvedValue(undefined);
  db.sales.sortBy.mockResolvedValue([]);

  supabase.from.mockReturnValue({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "sup-1" }, error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  });
});

// localDateStr helper for assertions
function localDateStr(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// -- useSalesReport --
describe("useSalesReport", () => {
  it("loads sales and sets loading=false", async () => {
    const { result } = renderHook(() => useSalesReport("today"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sales).toEqual([]);
  });

  it("resolves date filter: today", async () => {
    const { result } = renderHook(() => useSalesReport("today"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.where).toHaveBeenCalledWith("date");
  });

  it("resolves date filter: week (from/to range)", async () => {
    const { result } = renderHook(() => useSalesReport("week"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.between).toHaveBeenCalled();
  });

  it("resolves date filter: month", async () => {
    const { result } = renderHook(() => useSalesReport("month"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.between).toHaveBeenCalled();
  });

  it("resolves date filter: year", async () => {
    const { result } = renderHook(() => useSalesReport("year"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.between).toHaveBeenCalled();
  });

  it("resolves date filter: custom range 2026-07-01:2026-07-04", async () => {
    const { result } = renderHook(() => useSalesReport("2026-07-01:2026-07-04"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.between).toHaveBeenCalled();
  });

  it("resolves date filter: specific date string", async () => {
    const { result } = renderHook(() => useSalesReport("2026-07-04"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.equals).toHaveBeenCalledWith("2026-07-04");
  });

  it("skips syncSalesForRange when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useSalesReport("today"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const { syncSalesForRange } = await import("../../lib/sync");
    expect(syncSalesForRange).not.toHaveBeenCalled();
  });

  it("reload reads from db without syncing", async () => {
    const { result } = renderHook(() => useSalesReport("today"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = db.sales.sortBy.mock.calls.length;
    await act(async () => { await result.current.reload(); });
    expect(db.sales.sortBy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// -- useCreateSale --
describe("useCreateSale", () => {
  it("adds sale to db and returns localId", async () => {
    const { result } = renderHook(() => useCreateSale());
    const localId = await result.current({
      items: [{ kode: "D-01", size: "Midi", warna: [{ nama: "HITAM", qty: 2 }], harga: 100000 }],
      total: 200000, discount: 0, buyerName: "Budi", buyerHp: "081",
      pelangganId: null, location: "gudang",
    });
    expect(localId).toBe(1);
    expect(db.sales.add).toHaveBeenCalled();
    expect(applyStokLocal).toHaveBeenCalled();
  });

  it("syncs to supabase when online", async () => {
    const { result } = renderHook(() => useCreateSale());
    await result.current({ items: [], total: 0, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang" });
    expect(supabase.from).toHaveBeenCalled();
  });

  it("does not sync when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useCreateSale());
    await result.current({ items: [], total: 0, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("builds stok adjustments from warna items", async () => {
    const { result } = renderHook(() => useCreateSale());
    await result.current({
      items: [{ kode: "D-01", size: "Midi", warna: [{ nama: "MERAH", qty: 1 }], harga: 100000 }],
      total: 100000, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang",
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toHaveLength(1);
    expect(callArgs.stok_adjustments[0].delta).toBe(-1);
  });

  it("items with qty=0 are excluded from stok adjustments", async () => {
    const { result } = renderHook(() => useCreateSale());
    await result.current({
      items: [{ kode: "D-01", size: "Midi", warna: [{ nama: "HITAM", qty: 0 }], harga: 100000 }],
      total: 0, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang",
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toHaveLength(0);
  });

  it("continues silently if supabase insert fails", async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error("network fail")),
    });
    const { result } = renderHook(() => useCreateSale());
    await expect(result.current({ items: [], total: 0, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang" })).resolves.toBe(1);
  });

  it("simple (colorless) item produces one adjustment with warna '_' (bug fix)", async () => {
    const { result } = renderHook(() => useCreateSale());
    await result.current({
      items: [{ kode: "D-02", size: "Midi", qty: 3, warna: null, harga: 90000 }],
      total: 270000, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang",
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toHaveLength(1);
    expect(callArgs.stok_adjustments[0]).toMatchObject({
      kode: "D-02", size: "Midi", warna: "_", location: "gudang", delta: -3,
    });
  });

  it("colored item with multi-location breakdown produces multiple adjustment entries", async () => {
    const { result } = renderHook(() => useCreateSale());
    await result.current({
      items: [{
        kode: "D-01", size: "Midi", harga: 100000,
        warna: [{
          nama: "HITAM", qty: 6,
          breakdown: [{ location: "gudang", qty: 4 }, { location: "cideng", qty: 2 }],
        }],
      }],
      total: 600000, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "gudang",
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toHaveLength(2);
    expect(callArgs.stok_adjustments).toEqual(expect.arrayContaining([
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -4 },
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: -2 },
    ]));
    expect(callArgs.location).toBe("gudang");
  });

  it("item without breakdown falls back to single fallbackLocation (regression, gabungan off)", async () => {
    const { result } = renderHook(() => useCreateSale());
    await result.current({
      items: [{ kode: "D-01", size: "Midi", harga: 100000, warna: [{ nama: "MERAH", qty: 2 }] }],
      total: 200000, discount: 0, buyerName: "", buyerHp: "", pelangganId: null, location: "cideng",
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toEqual([
      { kode: "D-01", size: "Midi", warna: "MERAH", location: "cideng", delta: -2 },
    ]);
  });
});

// -- useCreateRetur --
describe("useCreateRetur", () => {
  it("adds retur to db with positive delta", async () => {
    const { result } = renderHook(() => useCreateRetur());
    const originalSale = { location: "gudang", buyer_name: "Budi", buyer_hp: "081" };
    const localId = await result.current({
      originalSale,
      items: [{ kode: "D-01", size: "Midi", warna: [{ nama: "HITAM", qty: 1 }], harga: 100000 }],
      total: 100000,
    });
    expect(localId).toBe(1);
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.type).toBe("retur");
    expect(callArgs.stok_adjustments[0].delta).toBe(1); // positive for retur
  });

  it("syncs to supabase when online", async () => {
    const { result } = renderHook(() => useCreateRetur());
    await result.current({ originalSale: { location: "gudang" }, items: [], total: 0 });
    expect(supabase.from).toHaveBeenCalled();
  });

  it("does not sync when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useCreateRetur());
    await result.current({ originalSale: { location: "gudang" }, items: [], total: 0 });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("full retur of a multi-location sale exactly reverses original adjustments", async () => {
    const originalSale = {
      location: "gudang",
      stok_adjustments: [
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -4 },
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: -2 },
      ],
    };
    const { result } = renderHook(() => useCreateRetur());
    await result.current({
      originalSale,
      items: [{ kode: "D-01", size: "Midi", harga: 100000, warna: [{ nama: "HITAM", qty: 6 }] }],
      total: 600000,
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toEqual(expect.arrayContaining([
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: 4 },
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: 2 },
    ]));
    expect(callArgs.stok_adjustments).toHaveLength(2);
  });

  it("partial retur distributes proportionally with largest-remainder rounding (4 gudang + 2 cideng sold, retur 3 -> 2 gudang + 1 cideng)", async () => {
    const originalSale = {
      location: "gudang",
      stok_adjustments: [
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -4 },
        { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: -2 },
      ],
    };
    const { result } = renderHook(() => useCreateRetur());
    await result.current({
      originalSale,
      items: [{ kode: "D-01", size: "Midi", harga: 100000, warna: [{ nama: "HITAM", qty: 3 }] }],
      total: 300000,
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toEqual(expect.arrayContaining([
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: 2 },
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "cideng", delta: 1 },
    ]));
    expect(callArgs.stok_adjustments).toHaveLength(2);
  });

  it("retur with no matching original adjustments falls back fully to fallbackLocation (legacy sale, regression)", async () => {
    const originalSale = { location: "gudang", stok_adjustments: [] };
    const { result } = renderHook(() => useCreateRetur());
    await result.current({
      originalSale,
      items: [{ kode: "D-01", size: "Midi", harga: 100000, warna: [{ nama: "HITAM", qty: 3 }] }],
      total: 300000,
    });
    const callArgs = db.sales.add.mock.calls[0][0];
    expect(callArgs.stok_adjustments).toEqual([
      { kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: 3 },
    ]);
  });
});

// -- useUpdateSale --
describe("useUpdateSale", () => {
  it("updates local db for pending sale (no supabase_id)", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: null, items: [], discount: 0, edit_history: [] });
    const { result } = renderHook(() => useUpdateSale());
    await result.current({ id: 1, items: [], discount: 0, buyer_name: "A", buyer_hp: "081" });
    expect(db.sales.update).toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws when offline with supabase_id", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-1", items: [], discount: 0, edit_history: [] });
    const { result } = renderHook(() => useUpdateSale());
    await expect(result.current({ id: 1, supabase_id: "sup-1", items: [], discount: 0 })).rejects.toThrow("koneksi");
  });

  it("updates supabase first when online with supabase_id", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-1", items: [], discount: 0, edit_history: [] });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: "sup-1" }], error: null }),
    };
    supabase.from.mockReturnValue(updateChain);
    const { result } = renderHook(() => useUpdateSale());
    await result.current({ id: 1, supabase_id: "sup-1", items: [], discount: 0, buyer_name: "A", buyer_hp: "" });
    expect(db.sales.update).toHaveBeenCalled();
  });

  it("throws when supabase update returns 0 rows", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-1", items: [], discount: 0, edit_history: [] });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    supabase.from.mockReturnValue(updateChain);
    const { result } = renderHook(() => useUpdateSale());
    await expect(result.current({ id: 1, supabase_id: "sup-1", items: [], discount: 0 })).rejects.toThrow("0 baris");
  });

  it("throws when supabase update returns error", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-1", items: [], discount: 0, edit_history: [] });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: null, error: { message: "rls denied" } }),
    };
    supabase.from.mockReturnValue(updateChain);
    const { result } = renderHook(() => useUpdateSale());
    await expect(result.current({ id: 1, supabase_id: "sup-1", items: [], discount: 0 })).rejects.toThrow("rls denied");
  });

  it("recomputes stok_adjustments and includes them in the local patch", async () => {
    db.sales.get.mockResolvedValue({
      id: 1, supabase_id: null, location: "gudang", discount: 0, edit_history: [],
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -2 }],
    });
    const { result } = renderHook(() => useUpdateSale());
    await result.current({
      id: 1, location: "gudang", discount: 0,
      items: [{ kode: "D-01", size: "Midi", qty: 3, harga: 100000 }],
    });
    const patch = db.sales.update.mock.calls[0][1];
    expect(patch.stok_adjustments).toEqual([
      { kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -3 },
    ]);
  });

  it("applies reverse-old + apply-new stock diff locally for a pending sale", async () => {
    db.sales.get.mockResolvedValue({
      id: 1, supabase_id: null, location: "gudang", discount: 0, edit_history: [],
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -2 }],
    });
    const { result } = renderHook(() => useUpdateSale());
    await result.current({
      id: 1, location: "gudang", discount: 0,
      items: [{ kode: "D-01", size: "Midi", qty: 3, harga: 100000 }],
    });
    expect(applyStokLocal).toHaveBeenCalled();
    const diff = applyStokLocal.mock.calls[0][0];
    expect(diff).toEqual(expect.arrayContaining([
      { kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: 2 },
      { kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -3 },
    ]));
  });

  it("produces a net-zero stock diff (reverse + new cancel out) when items are unchanged", async () => {
    db.sales.get.mockResolvedValue({
      id: 1, supabase_id: null, location: "gudang", discount: 0, edit_history: [],
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -2 }],
    });
    const { result } = renderHook(() => useUpdateSale());
    await result.current({
      id: 1, location: "gudang", discount: 0,
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
    });
    const diff = applyStokLocal.mock.calls[0][0];
    const net = diff
      .filter((a) => a.kode === "D-01" && a.location === "gudang")
      .reduce((s, a) => s + a.delta, 0);
    expect(net).toBe(0);
  });

  it("applies the stock diff to supabase and includes it in the update payload when supabase_id exists", async () => {
    db.sales.get.mockResolvedValue({
      id: 1, supabase_id: "sup-1", location: "gudang", discount: 0, edit_history: [],
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -2 }],
    });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: "sup-1" }], error: null }),
    };
    supabase.from.mockReturnValue(updateChain);
    const { result } = renderHook(() => useUpdateSale());
    await result.current({
      id: 1, supabase_id: "sup-1", location: "gudang", discount: 0,
      items: [{ kode: "D-01", size: "Midi", qty: 3, harga: 100000 }],
    });
    expect(applyStokToSupabase).toHaveBeenCalled();
    const supabasePayload = updateChain.update.mock.calls[0][0];
    expect(supabasePayload.stok_adjustments).toEqual([
      { kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -3 },
    ]);
  });

  it("does not call applyStokToSupabase for a pending sale (no supabase_id)", async () => {
    db.sales.get.mockResolvedValue({
      id: 1, supabase_id: null, location: "gudang", discount: 0, edit_history: [],
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -2 }],
    });
    const { result } = renderHook(() => useUpdateSale());
    await result.current({
      id: 1, location: "gudang", discount: 0,
      items: [{ kode: "D-01", size: "Midi", qty: 3, harga: 100000 }],
    });
    expect(applyStokToSupabase).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("computes stock adjustments for a newly-added warna item during an edit session", async () => {
    db.sales.get.mockResolvedValue({
      id: 1, supabase_id: null, location: "gudang", discount: 0, edit_history: [],
      items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 100000 }],
      stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -2 }],
    });
    const { result } = renderHook(() => useUpdateSale());
    await result.current({
      id: 1, location: "gudang", discount: 0,
      items: [
        { kode: "D-01", size: "Midi", qty: 2, harga: 100000 },
        { kode: "D-04", size: "Gamis", harga: 100000, warna: [{ nama: "HITAM", qty: 1 }] },
      ],
    });
    const diff = applyStokLocal.mock.calls[0][0];
    expect(diff).toEqual(expect.arrayContaining([
      { kode: "D-04", size: "Gamis", warna: "HITAM", location: "gudang", delta: -1 },
    ]));
  });
});

// -- useDeleteSale --
describe("useDeleteSale", () => {
  it("deletes pending sale from db only (no supabase_id)", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: null, stok_adjustments: [] });
    const { result } = renderHook(() => useDeleteSale());
    await result.current({ id: 1 });
    expect(db.sales.delete).toHaveBeenCalledWith(1);
    expect(deleteSaleFromSupabase).not.toHaveBeenCalled();
  });

  it("deletes from supabase first when supabase_id present", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-1", stok_adjustments: [] });
    const { result } = renderHook(() => useDeleteSale());
    await result.current({ id: 1 });
    expect(deleteSaleFromSupabase).toHaveBeenCalled();
    expect(db.sales.delete).toHaveBeenCalledWith(1);
  });

  it("throws when offline and supabase_id present", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-1", stok_adjustments: [] });
    const { result } = renderHook(() => useDeleteSale());
    await expect(result.current({ id: 1 })).rejects.toThrow("koneksi");
    expect(db.sales.delete).not.toHaveBeenCalled();
  });

  it("reverses stok locally after delete", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: null, stok_adjustments: [{ kode: "D-01", size: "Midi", warna: "HITAM", location: "gudang", delta: -2 }] });
    const { result } = renderHook(() => useDeleteSale());
    await result.current({ id: 1 });
    expect(applyStokLocal).toHaveBeenCalled();
    const callArgs = applyStokLocal.mock.calls[0][0];
    expect(callArgs[0].delta).toBe(2); // reversed
  });

  it("marks supabase_id as deleted", async () => {
    db.sales.get.mockResolvedValue({ id: 1, supabase_id: "sup-del", stok_adjustments: [] });
    const { result } = renderHook(() => useDeleteSale());
    await result.current({ id: 1 });
    expect(markSaleDeleted).toHaveBeenCalledWith("sup-del");
  });

  it("falls back to passed sale if db.get returns undefined", async () => {
    db.sales.get.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteSale());
    await result.current({ id: 99, supabase_id: null, stok_adjustments: [] });
    expect(db.sales.delete).toHaveBeenCalledWith(99);
  });
});
