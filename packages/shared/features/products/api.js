import { supabase } from "../../lib/supabase";

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .order("nama", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
