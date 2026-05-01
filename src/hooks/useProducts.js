import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// MODULE-LEVEL CACHE → tidak fetch ulang setiap navigasi antar route
let _cache = null;
let _inflight = null;

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
}

export function useProducts() {
  const [products, setProducts] = useState(_cache);
  const [loading, setLoading] = useState(_cache === null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cache !== null) return;

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
  }, []);

  return { products, loading, error };
}

// Single product (by kode) — pakai cache list kalau ada
export function useProduct(kode) {
  const { products, loading, error } = useProducts();
  const product = products?.find((p) => p.kode === kode) ?? null;
  return { product, loading, error };
}
