/**
 * features/pelanggan/api.js
 * Panggilan Supabase MENTAH untuk fitur riwayat pembelian pelanggan (Admin).
 * Pure async, tidak ada React.
 *
 * Beda dari apps/pos/src/features/pelanggan (yang offline-first via Dexie
 * utk kasir) — Admin ONLINE-ONLY, jadi langsung query Supabase tanpa cache
 * lokal, sama seperti pola features/produk/api.js.
 */
import { supabase } from "@deera/shared/lib/supabase";

// Daftar seluruh pelanggan terdaftar, diurutkan nama A-Z.
export async function fetchPelangganList() {
  const { data, error } = await supabase.from("pelanggan").select("*").order("nama");
  if (error) throw error;
  return data ?? [];
}

// Riwayat transaksi (sale & retur) milik satu pelanggan, terbaru dulu.
// HANYA mencakup sales yang punya pelanggan_id ter-link ke record ini —
// transaksi lama dengan buyer_name cocok tapi TANPA pelanggan_id (dibuat
// sebelum pelanggan didaftarkan / kasir tidak memilih dari daftar) TIDAK
// ikut kehitung, konsisten dengan cara `sales.pelanggan_id` diisi di
// apps/pos/src/features/penjualan/hooks.js.
export async function fetchSalesByPelanggan(pelangganId) {
  const { data, error } = await supabase
    .from("sales")
    .select("id, date, created_at, type, location, items, discount, total, buyer_name, buyer_hp, created_by_name")
    .eq("pelanggan_id", pelangganId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
