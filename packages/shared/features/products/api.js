/**
 * features/products/api.js
 * Panggilan Supabase MENTAH — pure async function, tidak ada React di sini.
 */
import { supabase } from "../../lib/supabase";

export async function fetchProducts() {
  // Urutan default (permintaan Denny 2026-08): produk TERBARU dibuat
  // duluan, lalu nama A-Z sebagai tiebreak — dipakai di SEMUA halaman yang
  // menampilkan daftar produk (Admin, POS, Katalog publik) yang tidak
  // melakukan sort sendiri. Sebelumnya diurutkan pakai kolom `position`
  // (kurasi manual katalog) — sengaja diganti sesuai instruksi eksplisit
  // untuk konsistensi lintas app, walau artinya `position` tidak lagi
  // dipakai untuk urutan tampil.
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .order("nama", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
