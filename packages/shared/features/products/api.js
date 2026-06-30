/**
 * features/products/api.js
 * Panggilan Supabase MENTAH — pure async function, tidak ada React di sini.
 */
import { supabase } from "../../lib/supabase";

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
