import { supabase } from "../../lib/supabase";

// Baca-saja, LINTAS APP (admin & pos) — CRUD keep order sendiri tetap milik
// apps/pos/src/features/keep (sengaja tidak dipindah, lihat CLAUDE.md §7 &
// §8 soal Keep). Modul ini HANYA utk agregasi "berapa unit sedang di-Keep"
// (laporan admin: stok yang TERLIHAT di tim gudang & tim pasar tidak
// mencerminkan barang yang sudah dipesan via Keep, bikin bingung) — lihat
// utils.js utk cara agregasinya, hooks.js utk public surface.
export async function fetchActiveKeepItems() {
  const { data, error } = await supabase.from("keep_orders").select("items").eq("status", "aktif");
  if (error) throw error;
  return (data ?? []).flatMap((row) => row.items ?? []);
}
