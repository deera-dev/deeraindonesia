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
