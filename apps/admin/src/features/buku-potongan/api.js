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
 *
 * REVISI 2026-07-19 — perbaikan logika rekonsiliasi (laporan Denny):
 * sebelumnya "actual" yang dibandingkan ke expected_qty hanya berasal
 * dari stok_warna (barang yang BELUM terjual) — begitu ada penjualan,
 * selisih akan selalu menyimpang walau tidak ada yang salah. Ditambah
 * `soldMap` (dari RPC `get_sold_summary_by_variant`, lihat migration
 * supabase/migrations/20260719_buku_potongan_rpc_sold_summary_by_variant.sql
 * untuk penjelasan lengkap kenapa RPC & bukan tarik tabel `sales` ke
 * client) — "terjual bersih" (penjualan dikurangi retur) per
 * kode+size+warna, seluruh histori. Perbandingan yang benar sekarang
 * di komponen (BukuPotonganPage.jsx): expected_qty vs (stok tersisa +
 * terjual bersih).
 */
import { supabase } from "@deera/shared/lib/supabase";

/**
 * fetchBukuPotonganData — ambil stok_warna + expected_stok + ringkasan
 * terjual bersih sekaligus.
 * Mengembalikan { stokRows, expectedRows, soldMap, tableError } —
 * tableError true kalau tabel expected_stok belum dibuat (Postgres code
 * 42P01). soldMap berbentuk { [kode]: { [size]: { [warna]: netQty } } }
 * — kalau RPC gagal/tidak tersedia, fallback ke {} (tidak pernah
 * melempar error ke pemanggil, sama seperti fetchStokMap/fetchSalesByKode
 * di features/produk/api.js).
 */
export async function fetchBukuPotonganData() {
  const [stokRes, expRes, soldRes] = await Promise.all([
    supabase.from("stok_warna").select("kode, size, warna, gudang, cideng, tegalgubug"),
    supabase.from("expected_stok").select("kode, size, warna, expected_qty"),
    supabase.rpc("get_sold_summary_by_variant"),
  ]);
  return {
    stokRows: stokRes.data ?? [],
    expectedRows: expRes.data ?? [],
    soldMap: soldRes.data ?? {},
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
