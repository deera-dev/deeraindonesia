import { supabase } from "@deera/shared/lib/supabase";
import type { VisitStats } from "./schema";

export async function fetchVisitStats(start: string, end: string): Promise<VisitStats> {
  const { data, error } = await supabase.rpc("get_visit_stats", { p_start: start, p_end: end });
  if (error) throw error;
  return data;
}
