/** features/trafik-katalog/api.js — statistik kunjungan katalog (RPC get_visit_stats). */
import { supabase } from "@deera/shared/lib/supabase";

export async function fetchVisitStats(days = 30) {
  const { data, error } = await supabase.rpc("get_visit_stats", { p_days: days });
  if (error) throw error;
  return data;
}
