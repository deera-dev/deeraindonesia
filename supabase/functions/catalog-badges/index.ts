/**
 * catalog-badges — Supabase Edge Function
 *
 * Template for the {action, input}-dispatched Edge Function convention
 * (see ../_shared/actions.ts). Fronts the public, read-only "badge kode"
 * RPCs catalog's product grid uses to flag sold-out / limited-stock / new /
 * best-selling products. No auth required - these RPCs are already callable
 * with the anon key under the project's existing RLS, so this function's
 * job is purely to be the HTTP seam catalog calls instead of
 * `supabase.rpc(...)` directly from the browser - the actual logic stays in
 * Postgres.
 *
 * NOT yet wired to apps/catalog - this is the reference template for the
 * {action,input} convention. Catalog's real cutover (including deploying
 * and verifying this function against a live project) happens in M2.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(_req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
}

async function kodesFromRpc(supabase: SupabaseClient, rpcName: string): Promise<string[]> {
  const { data, error } = await supabase.rpc(rpcName);
  if (error || !data) return [];
  return data.map((r: { kode: string }) => r.kode);
}

const handler = createActionHandler(
  {
    "sold-out": (_input, { supabase }) => kodesFromRpc(supabase, "get_sold_out_kodes"),
    "limited-stok": (_input, { supabase }) => kodesFromRpc(supabase, "get_limited_stok_kodes"),
    baru: (_input, { supabase }) => kodesFromRpc(supabase, "get_baru_kodes"),
    terlaris: async (_input, { supabase }) => {
      const { data, error } = await supabase.rpc("get_terlaris_kodes");
      if (error || !data) return [];
      return data;
    },
  },
  getClient,
);

Deno.serve(handler);
