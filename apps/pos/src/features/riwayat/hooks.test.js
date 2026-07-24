import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("../../lib/db", () => ({
  db: {
    sales: {
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));
vi.mock("./api", () => ({
  fetchProductHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock("./utils", () => ({
  presetToDates: vi.fn().mockReturnValue({ dateFrom: "2026-07-01", dateTo: "2026-07-07" }),
}));

import { db } from "../../lib/db";
import { fetchProductHistory } from "./api";
import { useRiwayat } from "./hooks";

beforeEach(() => {
  vi.clearAllMocks();
  db.sales.toArray.mockResolvedValue([]);
  fetchProductHistory.mockResolvedValue([]);
});

describe("useRiwayat", () => {
  it("initializes with loading=true", () => {
    db.sales.toArray.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "semua" }));
    expect(result.current.loading).toBe(true);
  });

  it("sets loading=false after data loads", async () => {
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "semua" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("loads sales from db when category is semua", async () => {
    db.sales.toArray.mockResolvedValue([
      { id: 1, type: "sale", buyer_name: "BUDI", total: 100000, date: "2026-07-04", created_at: "2026-07-04T10:00:00Z", items: [] },
    ]);
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "semua" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.items[0]._type).toBe("sale");
  });

  it("preserves stok_adjustments on normalized sale items", async () => {
    const stok_adjustments = [
      { kode: "D-01", size: "Midi", warna: "_", location: "gudang", delta: -4 },
      { kode: "D-01", size: "Midi", warna: "_", location: "cideng", delta: -2 },
    ];
    db.sales.toArray.mockResolvedValue([
      { id: 1, type: "sale", buyer_name: "BUDI", total: 100000, date: "2026-07-04", created_at: "2026-07-04T10:00:00Z", items: [], stok_adjustments },
    ]);
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "semua" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0].stok_adjustments).toEqual(stok_adjustments);
  });

  it("loads sales from db when category is transaksi", async () => {
    db.sales.toArray.mockResolvedValue([
      { id: 1, type: "sale", buyer_name: "BUDI", total: 100000, date: "2026-07-04", created_at: "2026-07-04T10:00:00Z", items: [] },
    ]);
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "transaksi" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.length).toBe(1);
    expect(fetchProductHistory).not.toHaveBeenCalled();
  });

  it("skips db sales when category is not semua/transaksi", async () => {
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "produk" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(db.sales.orderBy).not.toHaveBeenCalled();
  });

  it("loads history from supabase when not transaksi category", async () => {
    fetchProductHistory.mockResolvedValue([
      { id: "h1", action: "tambah", category: "produk", kode: "D-01", changed_at: "2026-07-04T10:00:00Z" },
    ]);
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "produk" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0]._type).toBe("history");
  });

  it("sets error message when fetchProductHistory throws", async () => {
    fetchProductHistory.mockRejectedValue(new Error("network fail"));
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "produk" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network fail");
  });

  it("sorts combined items by changed_at descending", async () => {
    db.sales.toArray.mockResolvedValue([
      { id: 1, type: "sale", buyer_name: "BUDI", total: 100, date: "2026-07-04", created_at: "2026-07-04T08:00:00Z", items: [] },
    ]);
    fetchProductHistory.mockResolvedValue([
      { id: "h1", action: "tambah", category: "produk", kode: "D-01", changed_at: "2026-07-04T12:00:00Z" },
    ]);
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "semua" }));
    await waitFor(() => expect(result.current.items.length).toBe(2));
    expect(new Date(result.current.items[0].changed_at) > new Date(result.current.items[1].changed_at)).toBe(true);
  });

  it("reload re-fetches data", async () => {
    const { result } = renderHook(() => useRiwayat({ preset: "week", category: "semua" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const prevCalls = db.sales.toArray.mock.calls.length;
    await act(async () => { await result.current.reload(); });
    expect(db.sales.toArray.mock.calls.length).toBeGreaterThan(prevCalls);
  });
});
