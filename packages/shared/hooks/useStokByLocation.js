/**
 * useStokByLocation.js
 * Ambil daftar stok_warna dari lokasi tertentu — hanya baris dengan stok > 0.
 * Dipakai oleh TransferForm untuk memilih barang yang akan ditransfer.
 */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useStokByLocation(location) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) {
      setItems([]);
      return;
    }
    setLoading(true);

    supabase
      .from("stok_warna")
      .select("id, kode, size, warna, gudang, cideng, tegalgubug")
      .gt(location, 0) // hanya item yang ada stok di lokasi ini
      .order("kode", { ascending: true })
      .order("size", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("[useStokByLocation]", error);
          setItems([]);
        } else setItems(data ?? []);
        setLoading(false);
      });
  }, [location]);

  return { items, loading };
}
