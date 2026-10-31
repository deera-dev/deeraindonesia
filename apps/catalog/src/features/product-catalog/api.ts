import { supabase } from "@deera/shared/lib/supabase";

export async function fetchSoldOutKodes(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_sold_out_kodes");
  if (error || !data) return [];
  return data.map((r: { kode: string }) => r.kode);
}

export async function fetchLimitedStokKodes(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_limited_stok_kodes");
  if (error || !data) return [];
  return data.map((r: { kode: string }) => r.kode);
}

export async function fetchBaruKodes(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_baru_kodes");
  if (error || !data) return [];
  return data.map((r: { kode: string }) => r.kode);
}

export interface TerlarisRow {
  kode: string;
  periode: string;
}

export async function fetchTerlarisKodes(): Promise<TerlarisRow[]> {
  const { data, error } = await supabase.rpc("get_terlaris_kodes");
  if (error || !data) return [];
  return data;
}
