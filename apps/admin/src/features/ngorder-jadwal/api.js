import { supabase } from "@deera/shared/lib/supabase";
import { markTokoVisitedViaTrip } from "../ngorder/api";
import { toggleTokoVisited, validateTrip } from "./utils";

const TABLE = "ngorder_trip";

const cleanList = (arr) => [
  ...new Set((arr ?? []).map((s) => String(s ?? "").trim()).filter(Boolean)),
];
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
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("tanggal_mulai", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTrip({ user, ...input }) {
  const problem = validateTrip(input);
  if (problem) throw new Error(problem);
  const payload = {
    ...normalize(input),
    created_by_email: user?.email ?? null,
    updated_at: new Date().toISOString(),
  };
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

export async function fetchTripOpens(tripId) {
  if (!tripId) return [];
  const { data, error } = await supabase.rpc("get_ngorder_trip_opens", { p_trip_id: tripId });
  if (error) throw error;
  return data ?? [];
}

// Centang "dikunjungi" di checklist trip -> ikut tercatat sbg kunjungan
// selesai di toko_kunjungan (tab Peta, fitur ngorder), biar gak perlu
// dicatat 2x. Uncheck TIDAK membatalkan catatan kunjungan itu (sengaja --
// lihat §2 docs/reports/audit-report-m4-admin.md, hindari ngilangin
// catatan kunjungan nyata cuma gara-gara klik salah di checklist).
export async function toggleTripTokoVisited(tripId, toko, tokoId, user) {
  const next = toggleTokoVisited(toko, tokoId);
  const trip = await updateTrip(tripId, { toko: next });

  const justVisited = next.find((t) => t.toko_id === tokoId)?.dikunjungi;
  if (justVisited) {
    markTokoVisitedViaTrip(tokoId, user).catch((err) =>
      console.warn("markTokoVisitedViaTrip error:", err),
    );
  }
  return trip;
}

// Sinkronisasi dgn toko_kunjungan (fitur ngorder, tab Peta) — begitu toko
// ditandai "selesai" di sana, checklist di trip manapun yang masih aktif
// (rencana/berjalan) dan belum centang toko itu ikut tercentang otomatis.
// Trip yang sudah selesai/batal TIDAK disentuh (laporan histori gak
// berubah sendiri). Dipanggil dari ngorder/api.js (updateKunjungan).
export async function markTokoVisitedInActiveTrips(tokoId) {
  if (!tokoId) return;
  const { data: trips, error } = await supabase
    .from(TABLE)
    .select("id, toko")
    .in("status", ["rencana", "berjalan"]);
  if (error) throw error;

  for (const trip of trips ?? []) {
    const list = trip.toko ?? [];
    const idx = list.findIndex((t) => t.toko_id === tokoId && !t.dikunjungi);
    if (idx === -1) continue;
    const next = list.map((t, i) => (i === idx ? { ...t, dikunjungi: true } : t));
    const { error: updateErr } = await supabase
      .from(TABLE)
      .update({ toko: next, updated_at: new Date().toISOString() })
      .eq("id", trip.id);
    if (updateErr) throw updateErr;
  }
}
