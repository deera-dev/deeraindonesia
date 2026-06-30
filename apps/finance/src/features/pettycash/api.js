/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Petty Cash.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";

/** Ambil SEMUA baris (tidak difilter) — saldo petty cash bersifat all-time. */
export async function fetchPettycashAll() {
  const { data, error } = await supabase
    .from("pettycash")
    .select("*")
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function savePettycash({ payload, editing }) {
  if (editing) {
    const { error } = await supabase.from("pettycash").update(payload).eq("id", editing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("pettycash").insert(payload);
    if (error) throw error;
  }
}

export async function deletePettycash(id) {
  const { error } = await supabase.from("pettycash").delete().eq("id", id);
  if (error) throw error;
}
