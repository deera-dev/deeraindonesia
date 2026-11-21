import { supabase } from "@deera/shared/lib/supabase";
import { type Product, productsResponseSchema } from "./schema";

// PR-008 (docs/product/pr-plan.md): reads products_public (no hpp) instead
// of the shared, admin-oriented products table - see
// supabase/migrations/20261121_products_public_view.sql.
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products_public")
    .select("*")
    .order("created_at", { ascending: false })
    .order("nama", { ascending: true });

  if (error) throw error;
  return productsResponseSchema.parse(data ?? []);
}
