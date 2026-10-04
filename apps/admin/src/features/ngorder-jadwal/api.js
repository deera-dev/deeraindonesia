/**
 * features/ngorder-jadwal/api.js — Supabase mentah utk tabel ngorder_trip
 * (lihat supabase/migrations/20261004_ngorder_jadwal.sql).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { validateTrip } from "./utils";

const TABLE = "ngorder_trip";

const cleanList = (arr) => [...new Set((arr ?? []).map((s) => String(s ?? "").trim()).filter(Boolean))];
const cleanMoney = (n) => Math.max(0, Math.round(Number(n) || 0));

const NORMALIZERS = {
  nama: (v) => String(v ?? "").trim(),
  tanggal_mulai: (v) => v,
  tanggal_selesai: (v) => v,
  daerah: cleanList,
  peserta: cleanList,
  modal_awal: cleanMoney,
  status: (v) => v,
  sampel: (v) => v ?? [],
  toko: (v) => v ?? [],
  biaya: (v) => v ?? [],
  catatan: (v) => (v ?? "").trim() || null,
};

function normalize(input) {
  const out = {};
  for (const [key, fn] of Object.entries(NORMALIZERS)) if (key in input) out[key] = fn(input[key]);
  return out;
}

export async function fetchTrips() {
  const { data, error } = await supabase.from(TABLE).select("*").order("tanggal_mulai", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTrip({ user, ...input }) {
  const problem = validateTrip(input);
  if (problem) throw new Error(problem);
  const payload = { ...normalize(input), created_by_email: user?.email ?? null, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateTrip(id, patch) {
  if (!id) throw new Error("id jadwal wajib diisi.");
  const payload = { ...normalize(patch), updated_at: new Date().toISOString() };
  if ("nama" in payload && !payload.nama) throw new Error("Nama jadwal wajib diisi.");
  const { data, error } = await supabase.from(TABLE).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id) {
  if (!id) throw new Error("id jadwal wajib diisi.");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
