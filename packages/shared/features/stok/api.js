/**
 * features/stok/api.js
 * Ambil daftar stok_warna dari lokasi tertentu — hanya baris dengan stok > 0.
 * Dipakai oleh TransferForm untuk memilih barang yang akan ditransfer.
 */
import { supabase } from "../../lib/supabase";

export async function fetchStokByLocation(location) {
  if (!location) return [];

  const { data, error } = await supabase
    .from("stok_warna")
    .select("id, kode, size, warna, gudang, cideng, tegalgubug")
    .gt(location, 0) // hanya item yang ada stok di lokasi ini
    .order("kode", { ascending: true })
    .order("size", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
