/**
 * features/buku-potongan/api.js
 * Panggilan Supabase MENTAH untuk Buku Potongan (expected vs actual stok) —
 * pure async, tidak ada React di sini.
 *
 * SQL tabel expected_stok (jika belum ada):
 *   CREATE TABLE expected_stok (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     kode text NOT NULL, size text NOT NULL,
 *     warna text NOT NULL DEFAULT '_',
 *     expected_qty integer NOT NULL DEFAULT 0,
 *     updated_at timestamptz DEFAULT now(),
 *     UNIQUE(kode, size, warna)
 *   );
 */
import { supabase } from "@deera/shared/lib/supabase";

/**
 * fetchBukuPotonganData — ambil stok_warna + expected_stok sekaligus.
 * Mengembalikan { stokRows, expectedRows, tableError } — tableError true
 * kalau tabel expected_stok belum dibuat (Postgres code 42P01).
 */
export async function fetchBukuPotonganData() {
  const [stokRes, expRes] = await Promise.all([
    supabase.from("stok_warna").select("kode, size, warna, gudang, cideng, tegalgubug"),
    supabase.from("expected_stok").select("kode, size, warna, expected_qty"),
  ]);
  return {
    stokRows: stokRes.data ?? [],
    expectedRows: expRes.data ?? [],
    tableError: expRes.error?.code === "42P01",
  };
}

// rows: [{kode, size, warna, expected_qty}] — warna sudah dinormalisasi ("_" jika kosong)
export async function upsertExpectedStok(rows) {
  const upsertRows = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { error } = await supabase
    .from("expected_stok")
    .upsert(upsertRows, { onConflict: "kode,size,warna" });
  if (error) throw error;
  return upsertRows;
}
