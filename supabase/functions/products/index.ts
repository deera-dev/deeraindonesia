/**
 * products — Supabase Edge Function
 *
 * Fronts packages/shared/features/products/api.ts's fetchProducts() - the
 * single "read all products" source shared by all 4 apps. One action
 * ("list") for now; kept action-dispatched (not a bare handler) so every
 * Edge Function in this repo follows the same {action,input} shape, per
 * ../_shared/actions.ts.
 *
 * Uses the anon key (same as the direct-Supabase call it replaces) - no
 * privilege escalation here, this is purely the HTTP seam. Still returns
 * `select("*")`, i.e. including `hpp` (internal cost price); that column
 * stays in the response until catalog's actual anon-facing read is
 * narrowed to a products_public view (tracked separately, see
 * docs/product/pr-plan.md PR-007/008/009) - this function is consumed by
 * all 4 apps for now, not just the public catalog, so this is not the
 * place to drop columns.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(_req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
}

async function listProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .order("nama", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

const handler = createActionHandler(
  {
    list: (_input, { supabase }) => listProducts(supabase),
  },
  getClient,
);

Deno.serve(handler);
