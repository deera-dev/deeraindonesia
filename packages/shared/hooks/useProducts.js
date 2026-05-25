import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// MODULE-LEVEL CACHE → tidak fetch ulang setiap navigasi antar route
let _cache = null;
let _inflight = null;

// Subscriber set — setiap useProducts instance mendaftar agar bisa di-trigger refresh
const _refreshListeners = new Set();

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function invalidateProducts() {
  _cache = null;
  _inflight = null;
  // Beritahu semua hook yang aktif untuk re-fetch
  _refreshListeners.forEach((fn) => fn());
}

export function useProducts() {
  const [products, setProducts] = useState(_cache);
  const [loading, setLoading] = useState(_cache === null);
  const [error, setError] = useState(null);
  const [_rev, setRev] = useState(0); // naik setiap invalidate

  // Daftarkan listener refresh
  useEffect(() => {
    const refresh = () => {
      setProducts(null);
      setLoading(true);
      setRev((r) => r + 1);
    };
    _refreshListeners.add(refresh);
    return () => _refreshListeners.delete(refresh);
  }, []);

  useEffect(() => {
    if (_cache !== null) {
      setProducts(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;

    if (!_inflight) {
      _inflight = fetchProducts();
    }

    _inflight
      .then((data) => {
        if (cancelled) return;
        _cache = data;
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        _inflight = null;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [_rev]);

  return { products, loading, error };
}

// Single product (by kode) — pakai cache list kalau ada
export function useProduct(kode) {
  const { products, loading, error } = useProducts();
  const product = products?.find((p) => p.kode === kode) ?? null;
  return { product, loading, error };
}
