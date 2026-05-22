// Offline-first products: cache lokal di IndexedDB, sync dari Supabase jika online
// Products di-enrich dengan data stok_warna per lokasi
import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { syncProducts, syncStok } from "../lib/sync";

async function loadEnriched() {
  const products  = await db.products.toArray();
  const stokRows  = await db.stok_warna.toArray();

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
          // Keep cached data — tetap tampil meski sync gagal
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { products, loading, fromCache, syncError };
}
