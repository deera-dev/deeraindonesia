import { supabase } from "@deera/shared/lib/supabase";

export async function fetchPasarRestock(market, target) {
  if (!market) return { restock: [], tidak_bergerak: [] };
  const { data, error } = await supabase.rpc("get_pasar_restock", {
    p_market: market,
    p_target: target,
  });
  if (error) throw error;
  return data ?? { restock: [], tidak_bergerak: [] };
}
