/**
 * stok — Supabase Edge Function
 *
 * Fronts packages/shared/features/stok/api.ts's fetchStokByLocation().
 * `location` is validated against the real location enum server-side too
 * (not just client-side) before it's used as a column name in the .gt()
 * filter - docs/reports/audit-report.md flagged the original code for
 * using an unvalidated caller string as a column identifier.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

const VALID_LOCATIONS = ["gudang", "cideng", "tegalgubug"];

function getClient(_req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
}

async function byLocation(supabase: SupabaseClient, location: unknown) {
  if (typeof location !== "string" || !VALID_LOCATIONS.includes(location)) {
    throw new Error(`Invalid location: ${String(location)}`);
  }

  const { data, error } = await supabase
    .from("stok_warna")
    .select("id, kode, size, warna, gudang, cideng, tegalgubug")
    .gt(location, 0)
    .order("kode", { ascending: true })
    .order("size", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

const handler = createActionHandler(
  {
    "by-location": (input, { supabase }) =>
      byLocation(supabase, (input as { location?: unknown })?.location),
  },
  getClient,
);

Deno.serve(handler);
