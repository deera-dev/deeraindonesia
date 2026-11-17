import { supabase } from "../../lib/supabase";

export async function fetchStokByLocation(location) {
  if (!location) return [];

  const { data, error } = await supabase
    .from("stok_warna")
    .select("id, kode, size, warna, gudang, cideng, tegalgubug, ngorder")
    .gt(location, 0)
    .order("kode", { ascending: true })
    .order("size", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
