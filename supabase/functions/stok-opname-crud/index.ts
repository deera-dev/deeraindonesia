/**
 * stok-opname-crud — Supabase Edge Function
 *
 * Fronts apps/admin's features/stok-opname save flow. Dulu
 * saveStokOpname() di api.js memecah upsert jadi 2 panggilan terpisah
 * (baris existing vs baris placeholder baru, lihat migration
 * 20261120_save_stok_opname.sql utk alasan historisnya) + logHistory
 * per kode yang tidak di-await. Sekarang 1 RPC (save_stok_opname),
 * atomik, identitas audit dari auth.uid().
 *
 * Perhitungan "before/after" per baris (merge changed value dgn baris
 * existing, fallback 0, decode id sintetik) TETAP di apps/admin's
 * api.js — pure, tidak nyentuh DB, tidak ada untungnya dipindah ke sini.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createActionHandler } from "../_shared/actions.ts";

function getClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

interface StokOpnameRow {
  kode: string;
  size: string;
  warna: string;
  before: { gudang: number; cideng: number; tegalgubug: number; ngorder: number };
  after: { gudang: number; cideng: number; tegalgubug: number; ngorder: number };
}

async function save(supabase: SupabaseClient, input: { rows: StokOpnameRow[] }) {
  const { data, error } = await supabase.rpc("save_stok_opname", { p_rows: input?.rows ?? [] });
  if (error) throw error;
  return data;
}

const handler = createActionHandler(
  {
    save: (input, { supabase }) => save(supabase, input as { rows: StokOpnameRow[] }),
  },
  getClient,
);

Deno.serve(handler);
