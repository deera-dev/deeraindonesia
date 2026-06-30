/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Kas.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";

export async function fetchKas({ filterBulan, filterJenis } = {}) {
  let q = supabase.from("kas").select("*").order("tanggal", { ascending: false }).order("created_at", { ascending: false });
  if (filterBulan) {
    const [year, month] = filterBulan.split("-");
    const start = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0);
    const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    q = q.gte("tanggal", start).lte("tanggal", end);
  }
  if (filterJenis && filterJenis !== "semua") q = q.eq("jenis", filterJenis);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function saveKas({ payload, editing }) {
  if (editing) {
    const { error } = await supabase.from("kas").update(payload).eq("id", editing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("kas").insert(payload);
    if (error) throw error;
  }
}

export async function deleteKas(id) {
  const { error } = await supabase.from("kas").delete().eq("id", id);
  if (error) throw error;
}

/** Ringkasan kas bulan berjalan (dipakai Dashboard) */
export async function fetchKasBulanIni(bulanAwalStr) {
  const { data } = await supabase.from("kas").select("jenis, jumlah").gte("tanggal", bulanAwalStr);
  const list = data ?? [];
  const kasMasuk = list.filter((k) => k.jenis === "masuk").reduce((s, k) => s + (k.jumlah || 0), 0);
  const kasKeluar = list.filter((k) => k.jenis === "keluar").reduce((s, k) => s + (k.jumlah || 0), 0);
  return { kasMasuk, kasKeluar };
}
