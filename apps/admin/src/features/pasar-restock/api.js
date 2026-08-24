/**
 * api.js — Lapisan akses data mentah (Supabase) fitur pasar-restock.
 * Pure async, tidak ada React. JANGAN diimpor langsung oleh komponen —
 * gunakan hooks.js (Dependency Inversion, lihat CLAUDE.md §4/§7).
 */
import { supabase } from "@deera/shared/lib/supabase";

// ── Semua baris stok_warna (semua lokasi sekaligus) ───────────────────────────
// Dipakai untuk hitung rasio stok pasar tujuan vs total stok semua lokasi —
// TIDAK difilter per lokasi seperti features/stok/api.js (yang dipakai
// TransferForm), karena di sini kita perlu breakdown gudang + pasar lain
// sekaligus untuk satu baris yang sama.
export async function fetchStokAll() {
  const { data, error } = await supabase
    .from("stok_warna")
    .select("id, kode, size, warna, gudang, cideng, tegalgubug, updated_at");
  if (error) throw error;
  return data ?? [];
}

// ── Kode produk yang laku (type="sale") di satu lokasi sejak tanggal tertentu ─
// sinceDateStr: "YYYY-MM-DD" (lokal, lihat localDateStr di @deera/shared/lib/bepUtils).
// Return array kode unik (bukan Set, supaya konsisten dgn field yg serializable
// untuk TanStack Query cache).
export async function fetchSoldKodesAtLocation(location, sinceDateStr) {
  if (!location) return [];
  const { data, error } = await supabase
    .from("sales")
    .select("items, type")
    .eq("location", location)
    .gte("date", sinceDateStr);
  if (error) throw error;

  const set = new Set();
  for (const row of data ?? []) {
    if (row.type !== "sale") continue; // retur tidak dihitung sebagai "bergerak"
    for (const item of row.items ?? []) {
      if (item?.kode) set.add(item.kode);
    }
  }
  return Array.from(set);
}
