// Offline-first products: cache lokal di IndexedDB, sync dari Supabase jika online
// Products di-enrich dengan data stok_warna per lokasi
import { useEffect, useRef, useState } from "react";
import { db } from "../lib/db";
import { syncProducts, syncStok } from "../lib/sync";
import { supabase } from "@deera/shared/lib/supabase";

async function loadEnriched() {
  const products  = await db.products.toArray();
  let   stokRows  = await db.stok_warna.toArray();

  // Jika produk ada tapi stok kosong, mungkin sedang di-clear() oleh syncStok.
  // Tunggu sebentar lalu coba lagi satu kali.
  if (products.length > 0 && stokRows.length === 0) {
    await new Promise((r) => setTimeout(r, 150));
    stokRows = await db.stok_warna.toArray();
  }

  // Build stokMap: { kode: { size: { warna: {gudang, cideng, tegalgubug} } } }
  const stokMap = {};
  for (const row of stokRows) {
    if (!stokMap[row.kode])              stokMap[row.kode] = {};
    if (!stokMap[row.kode][row.size])    stokMap[row.kode][row.size] = {};
    stokMap[row.kode][row.size][row.warna] = {
      gudang:     row.gudang     ?? 0,
      cideng:     row.cideng     ?? 0,
      tegalgubug: row.tegalgubug ?? 0,
    };
  }

  return products.map(p => ({
    ...p,
    stokByWarna: stokMap[p.kode] ?? {},
    _stokRowCount: stokRows.filter(r => r.kode === p.kode).length,
  }));
}

export function useProducts() {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [syncError,  setSyncError]  = useState(null);
  const [fromCache,  setFromCache]  = useState(false);

  // Debounce timer untuk Realtime — banyak perubahan stok_warna sekaligus
  // (mis. stok opname 5 warna) akan menghasilkan 5 event berturut-turut.
  // Debounce 600ms memastikan hanya satu syncStok() yang jalan setelah
  // semua event diterima.
  const realtimeTimer = useRef(null);

  // ── Helper: sync stok lalu refresh state ────────────────────────────────────
  async function refreshStok() {
    if (!navigator.onLine) return;
    try {
      await syncStok();
      const fresh = await loadEnriched();
      setProducts(fresh);
      setSyncError(null);
    } catch {
      // silent — background sync, jangan ganggu UI
    }
  }

  // ── Full load on mount: cache dulu, lalu sync Supabase ───────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Tampilkan cache lokal segera
      const cached = await loadEnriched();
      if (cached.length > 0 && !cancelled) {
        setProducts(cached);
        setLoading(false);
        setFromCache(true);
      }

      // 2. Sync dari Supabase jika online
      if (navigator.onLine) {
        try {
          await Promise.all([syncProducts(), syncStok()]);
          const fresh = await loadEnriched();
          if (!cancelled) {
            setProducts(fresh);
            setFromCache(false);
            setSyncError(null);
          }
        } catch (err) {
          if (!cancelled) setSyncError(err?.message ?? "Gagal sync produk/stok");
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Realtime: update stok langsung saat admin mengubah stok_warna ────────────
  // Debounce: tunggu 600ms setelah event terakhir sebelum sync.
  // Ini mencegah multiple syncStok() dari perubahan banyak baris sekaligus.
  useEffect(() => {
    const channel = supabase
      .channel("pos-stok-warna-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stok_warna" },
        () => {
          clearTimeout(realtimeTimer.current);
          realtimeTimer.current = setTimeout(() => { refreshStok(); }, 600);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(realtimeTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Re-sync saat tab kembali aktif (backup untuk Realtime) ───────────────────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refreshStok();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { products, loading, fromCache, syncError };
}
