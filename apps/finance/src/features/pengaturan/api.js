/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Pengaturan (tarif upah).
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { DEFAULT_FINANCE_CONFIG } from "./utils";

export async function fetchFinanceConfig() {
  const { data } = await supabase.from("finance_config").select("key, nilai");
  const config = { ...DEFAULT_FINANCE_CONFIG };
  for (const row of data ?? []) {
    if (row.key in config) config[row.key] = row.nilai;
  }
  return config;
}

export async function saveFinanceConfigValue(key, nilai) {
  const { error } = await supabase
    .from("finance_config")
    .upsert({ key, nilai, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}
