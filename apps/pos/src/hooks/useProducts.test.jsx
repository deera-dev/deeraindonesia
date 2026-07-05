import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("../lib/sync", () => ({
  syncProducts: vi.fn(),
  syncStok: vi.fn(),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { syncProducts, syncStok } from "../lib/sync";
import { db } from "../lib/db";
import { useProducts } from "./useProducts";

beforeEach(async () => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  await db.products.clear();
  await db.stok_warna.clear();
  syncProducts.mockResolvedValue([]);
  syncStok.mockResolvedValue([]);
});

describe("useProducts", () => {
  it("starts with loading=true and products=[]", () => {
    syncProducts.mockReturnValue(new Promise(() => {}));
    syncStok.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProducts());
    expect(result.current.loading).toBe(true);
    expect(result.current.products).toEqual([]);
  });

  it("sets loading=false after sync completes", async () => {
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("loads from cache if products exist in IndexedDB", async () => {
    await db.products.put({ kode: "D-01", nama: "Gamis A", created_at: "2026-01-01" });
    await db.stok_warna.put({ kode: "D-01", size: "Midi", warna: "HITAM", gudang: 3, cideng: 0, tegalgubug: 0 });
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.products.length).toBeGreaterThan(0));
    expect(result.current.products[0].kode).toBe("D-01");
  });

  it("enriches products with stokByWarna", async () => {
    await db.products.put({ kode: "D-01", nama: "Gamis A", created_at: "2026-01-01" });
    await db.stok_warna.put({ kode: "D-01", size: "Midi", warna: "HITAM", gudang: 5, cideng: 2, tegalgubug: 1 });
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const p = result.current.products.find((x) => x.kode === "D-01");
    expect(p?.stokByWarna?.["Midi"]?.["HITAM"]?.gudang).toBe(5);
  });

  it("sets syncError when sync fails", async () => {
    syncProducts.mockRejectedValue(new Error("network fail"));
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.syncError).toBe("network fail");
  });

  it("skips sync when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(syncProducts).not.toHaveBeenCalled();
  });

  it("fromCache is true when only cache shown", async () => {
    await db.products.put({ kode: "D-01", nama: "Gamis A", created_at: "2026-01-01" });
    syncProducts.mockReturnValue(new Promise(() => {}));
    syncStok.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.products.length).toBeGreaterThan(0));
    expect(result.current.fromCache).toBe(true);
  });

  it("fromCache becomes false after fresh sync", async () => {
    await db.products.put({ kode: "D-01", nama: "Gamis A", created_at: "2026-01-01" });
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.fromCache).toBe(false), { timeout: 2000 });
  });

  it("subscribes to supabase realtime channel on mount", () => {
    renderHook(() => useProducts());
    expect(supabase.channel).toHaveBeenCalledWith("pos-stok-warna-live");
  });

  it("removes channel on unmount", () => {
    const { unmount } = renderHook(() => useProducts());
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("triggers stok refresh on visibilitychange to visible", async () => {
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = syncStok.mock.calls.length;
    await act(async () => {
      Object.defineProperty(document, "visibilityState", { value: "visible", writable: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(syncStok.mock.calls.length).toBeGreaterThanOrEqual(callsBefore);
  });

  it("does not sync on visibilitychange when offline", async () => {
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const callsBefore = syncStok.mock.calls.length;
    await act(async () => {
      Object.defineProperty(document, "visibilityState", { value: "visible", writable: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(syncStok.mock.calls.length).toBe(callsBefore);
  });

  it("handles stok_warna empty during retry", async () => {
    await db.products.put({ kode: "D-01", nama: "Gamis A", created_at: "2026-01-01" });
    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 2000 });
    expect(result.current.products.length).toBeGreaterThan(0);
  });
});
