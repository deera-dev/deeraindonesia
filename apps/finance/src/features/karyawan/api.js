/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Karyawan.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";

/** Load semua karyawan aktif, diurutkan per tim lalu nama */
export async function fetchKaryawanAktif() {
  const { data, error } = await supabase
    .from("karyawan")
    .select("*")
    .eq("aktif", true)
    .order("tim")
    .order("nama");
  if (error) throw error;
  return data ?? [];
}

/** Load semua karyawan (aktif & non-aktif) */
export async function fetchKaryawanAll() {
  const { data, error } = await supabase.from("karyawan").select("*").order("tim").order("nama");
  if (error) throw error;
  return data ?? [];
}

export async function saveKaryawan({ payload, editing }) {
  if (editing) {
    const { error } = await supabase.from("karyawan").update(payload).eq("id", editing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("karyawan").insert(payload);
    if (error) throw error;
  }
}

export async function toggleKaryawanAktif(karyawan) {
  const { error } = await supabase
    .from("karyawan")
    .update({ aktif: !karyawan.aktif })
    .eq("id", karyawan.id);
  if (error) throw error;
}
