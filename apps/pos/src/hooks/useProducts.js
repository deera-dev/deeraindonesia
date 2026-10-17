import { useEffect, useRef, useState } from "react";
import { db } from "../lib/db";
import { syncProducts, syncStok } from "../lib/sync";
import { supabase } from "@deera/shared/lib/supabase";

async function loadEnriched() {
  const products = await db.products.toArray();
  let stokRows = await db.stok_warna.toArray();

  if (products.length > 0 && stokRows.length === 0) {
    await new Promise((r) => setTimeout(r, 150));
    stokRows = await db.stok_warna.toArray();
  }

  const stokMap = {};
  for (const row of stokRows) {
    if (!stokMap[row.kode]) stokMap[row.kode] = {};
    if (!stokMap[row.kode][row.size]) stokMap[row.kode][row.size] = {};
    stokMap[row.kode][row.size][row.warna] = {
      gudang: row.gudang ?? 0,
      cideng: row.cideng ?? 0,
      tegalgubug: row.tegalgubug ?? 0,
    };
  }

  const enriched = products.map((p) => ({
    ...p,
    stokByWarna: stokMap[p.kode] ?? {},
    _stokRowCount: stokRows.filter((r) => r.kode === p.kode).length,
  }));

  return enriched.sort((a, b) => {
    const d = (b.created_at ?? "").localeCompare(a.created_at ?? "");
    if (d !== 0) return d;
    return (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" });
  });
}

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const realtimeTimer = useRef(null);

  async function refreshStok() {
    if (!navigator.onLine) return;
    try {
      await syncStok();
      const fresh = await loadEnriched();
      setProducts(fresh);
      setSyncError(null);
    } catch {
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = await loadEnriched();
      if (cached.length > 0 && !cancelled) {
        setProducts(cached);
        setLoading(false);
        setFromCache(true);
      }

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("pos-stok-warna-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "stok_warna" }, () => {
        clearTimeout(realtimeTimer.current);
        realtimeTimer.current = setTimeout(() => {
          refreshStok();
        }, 600);
      })
      .subscribe();

    return () => {
      clearTimeout(realtimeTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refreshStok();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { products, loading, fromCache, syncError };
}
