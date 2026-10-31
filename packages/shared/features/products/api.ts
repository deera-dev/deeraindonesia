import { supabase } from "../../lib/supabase";
import { type Product, productsResponseSchema } from "./schema";

/**
 * Still calls Supabase directly (not the deployed `products` Edge Function
 * at supabase/functions/products/) - this sandbox has no network path to
 * invoke a live Edge Function and verify its HTTP response, so the actual
 * client cutover is deferred to M2 (catalog), where a real browser/Vercel
 * preview can confirm the round-trip before any app depends on it. The
 * function is deployed and ready; only this call site isn't pointed at it
 * yet. Response is still Zod-validated here either way.
 */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .order("nama", { ascending: true });

  if (error) throw error;
  return productsResponseSchema.parse(data ?? []);
}
