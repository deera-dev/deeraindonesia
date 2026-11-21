import { supabase } from "@deera/shared/lib/supabase";
import { markTokoVisitedViaTrip } from "../ngorder/api";
import type { CreateTripInput, Trip, TripOpenRow, TripToko, UpdateTripPatch } from "./schema";
import { toggleTokoVisited, validateTrip } from "./utils";

const TABLE = "ngorder_trip";

const cleanList = (arr: unknown): string[] => [
  ...new Set((Array.isArray(arr) ? arr : []).map((s) => String(s ?? "").trim()).filter(Boolean)),
];
const cleanMoney = (n: unknown): number => Math.max(0, Math.round(Number(n) || 0));

const NORMALIZERS: Record<string, (v: unknown) => unknown> = {
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
  catatan: (v) => String(v ?? "").trim() || null,
};

function normalize(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, fn] of Object.entries(NORMALIZERS)) if (key in input) out[key] = fn(input[key]);
  return out;
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("tanggal_mulai", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const problem = validateTrip(input);
  if (problem) throw new Error(problem);
  const payload = normalize(input as unknown as Record<string, unknown>);
  const { data, error } = await supabase.rpc("create_ngorder_trip", {
    p_nama: payload.nama,
    p_tanggal_mulai: payload.tanggal_mulai,
    p_tanggal_selesai: payload.tanggal_selesai,
    p_daerah: payload.daerah ?? [],
    p_peserta: payload.peserta ?? [],
    p_modal_awal: payload.modal_awal ?? 0,
    p_status: payload.status ?? "rencana",
    p_catatan: payload.catatan ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTrip(id: string, patch: UpdateTripPatch): Promise<Trip> {
  if (!id) throw new Error("id jadwal wajib diisi.");
  const payload = {
    ...normalize(patch as unknown as Record<string, unknown>),
    updated_at: new Date().toISOString(),
  };
  if ("nama" in payload && !payload.nama) throw new Error("Nama jadwal wajib diisi.");
  const { data, error } = await supabase.from(TABLE).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(id: string): Promise<void> {
  if (!id) throw new Error("id jadwal wajib diisi.");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTripOpens(tripId: string | null | undefined): Promise<TripOpenRow[]> {
  if (!tripId) return [];
  const { data, error } = await supabase.rpc("get_ngorder_trip_opens", { p_trip_id: tripId });
  if (error) throw error;
  return data ?? [];
}

export async function toggleTripTokoVisited(
  tripId: string,
  toko: TripToko[],
  tokoId: string,
): Promise<Trip> {
  const next = toggleTokoVisited(toko, tokoId);
  const trip = await updateTrip(tripId, { toko: next });

  const justVisited = next.find((t) => t.toko_id === tokoId)?.dikunjungi;
  if (justVisited) {
    markTokoVisitedViaTrip(tokoId).catch((err: unknown) =>
      console.warn("markTokoVisitedViaTrip error:", err),
    );
  }
  return trip;
}

export async function markTokoVisitedInActiveTrips(
  tokoId: string | null | undefined,
): Promise<void> {
  if (!tokoId) return;
  const { error } = await supabase.rpc("mark_toko_visited_in_active_trips", {
    p_toko_id: tokoId,
  });
  if (error) throw new Error(error.message);
}
