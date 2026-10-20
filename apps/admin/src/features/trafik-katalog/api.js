import { supabase } from "@deera/shared/lib/supabase";

export async function fetchVisitStats(start, end) {
  const { data, error } = await supabase.rpc("get_visit_stats", { p_start: start, p_end: end });
  if (error) throw error;
  return data;
}
