import { supabase } from "@deera/shared/lib/supabase";

export async function fetchSoldOutKodes() {
  const { data, error } = await supabase.rpc("get_sold_out_kodes");
  if (error || !data) return [];
  return data.map((r) => r.kode);
}

export async function fetchLimitedStokKodes() {
  const { data, error } = await supabase.rpc("get_limited_stok_kodes");
  if (error || !data) return [];
  return data.map((r) => r.kode);
}

export async function fetchBaruKodes() {
  const { data, error } = await supabase.rpc("get_baru_kodes");
  if (error || !data) return [];
  return data.map((r) => r.kode);
}

// Terlaris: RPC mengembalikan baris {kode, periode} — satu kode bisa muncul
// di lebih dari satu periode (mis. top-3 minggu ini SEKALIGUS top-3 bulan
// ini). periode: "7d" | "30d" | "90d" | "all".
export async function fetchTerlarisKodes() {
  const { data, error } = await supabase.rpc("get_terlaris_kodes");
  if (error || !data) return [];
  return data;
}
