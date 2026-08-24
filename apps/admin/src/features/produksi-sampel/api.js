/**
 * api.js — Lapisan akses data mentah (Supabase) fitur produksi-sampel.
 * Pure async, tidak ada React. JANGAN diimpor langsung oleh komponen —
 * gunakan hooks.js (Dependency Inversion ala React).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { buildNomor } from "./utils";

export async function fetchSampels() {
  const { data } = await supabase
    .from("sampel")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ── Edit sampel ──────────────────────────────────────────────────────────────
export async function updateSampel({ id, nomor, nama, tanggal, foto }) {
  const { error } = await supabase
    .from("sampel")
    .update({
      nama,
      tanggal,
      foto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-edit",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { nama, tanggal, foto },
  }).catch(() => {});
}

// ── Buat Planning (tahap sebelum sampel fisik dibuat) ─────────────────────────
// entry: {nama, tanggal}, bahanFotoUrl: string|null, modelFotoUrls: string[] (maks 3).
// Status awal "planning" — belum masuk antrean review approve/reject.
export async function createPlanning(entry, bahanFotoUrl, modelFotoUrls, { userEmail, userName }) {
  const insert = {
    nama: entry.nama,
    tanggal: entry.tanggal,
    foto: [],
    bahan_foto: bahanFotoUrl || null,
    model_foto: modelFotoUrls ?? [],
    nomor: buildNomor(),
    status: "planning",
    created_by: userEmail,
    created_by_name: userName,
  };
  const { data: inserted, error } = await supabase
    .from("sampel")
    .insert(insert)
    .select("nomor, nama")
    .single();
  if (error) throw error;

  logHistory({
    action: "sampel-planning-buat",
    category: "produksi",
    kode: inserted?.nomor ?? insert.nomor,
    nama: inserted?.nama ?? insert.nama,
    snapshot: insert,
  }).catch(() => {});

  return inserted ?? insert;
}

// ── Tandai sampel fisik sudah dibuat (planning → draft/Menunggu Review) ──────
// foto: string[] — foto sampel jadi yang sebenarnya (bukan bahan/model referensi).
export async function markSampelDibuat({ id, nomor, nama, foto }) {
  const { error } = await supabase
    .from("sampel")
    .update({
      status: "draft",
      foto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-tandai-dibuat",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { status: "draft", foto },
    before: { status: "planning" },
  }).catch(() => {});
}

// ── Buat sampel (multi-entry) ─────────────────────────────────────────────────
// entries: [{nama, tanggal}], urlsArr: [string[], ...] — sejajar dengan entries.
export async function createSampels(entries, urlsArr, { userEmail, userName }) {
  // batch_id: optional — graceful fallback untuk browser lama / http
  let batchId = null;
  try {
    batchId = crypto.randomUUID();
  } catch {
    /* ok */
  }

  const inserts = entries.map((entry, i) => ({
    nama: entry.nama,
    tanggal: entry.tanggal,
    foto: urlsArr[i] ?? [],
    nomor: buildNomor(),
    status: "draft",
    ...(batchId ? { batch_id: batchId } : {}),
    created_by: userEmail,
    created_by_name: userName,
  }));
  const { data: inserted, error } = await supabase
    .from("sampel")
    .insert(inserts)
    .select("nomor, nama");
  if (error) throw error;

  (inserted ?? inserts).forEach((ins) => {
    logHistory({
      action: "sampel-buat",
      category: "produksi",
      kode: ins.nomor,
      nama: ins.nama,
      snapshot: ins,
    }).catch(() => {});
  });

  return inserted ?? inserts;
}

// ── Simpan keputusan batch (approve/reject) ──────────────────────────────────
// sampelMap: { [id]: sampel } — dipassing explicit dari caller untuk lookup
// nomor/nama saat logHistory (bukan lookup internal via queryClient).
export async function saveBatchDecisions(decisions, sampelMap, { userEmail }) {
  const toProcess = Object.entries(decisions).filter(([, d]) => d.choice !== null);
  const now = new Date().toISOString();

  await Promise.all(
    toProcess.map(async ([id, dec]) => {
      const payload =
        dec.choice === "approve"
          ? {
              status: "approved",
              sesuai_sampel: !dec.catatan,
              perubahan: dec.catatan || null,
              approved_by: userEmail,
              approved_at: now,
              updated_at: now,
            }
          : dec.choice === "ditahan"
          ? {
              status: "ditahan",
              ditahan_by: userEmail,
              ditahan_at: now,
              ditahan_note: dec.catatan || null,
              updated_at: now,
            }
          : {
              status: "rejected",
              rejected_by: userEmail,
              rejected_at: now,
              rejection_note: dec.alasan,
              updated_at: now,
            };
      const { error } = await supabase.from("sampel").update(payload).eq("id", id);
      if (error) throw error;
    }),
  );

  toProcess.forEach(([id, dec]) => {
    const sampel = sampelMap[id];
    if (!sampel) return;
    logHistory({
      action:
        dec.choice === "approve"
          ? "sampel-approve"
          : dec.choice === "ditahan"
          ? "sampel-tahan"
          : "sampel-reject",
      category: "produksi",
      kode: sampel.nomor,
      nama: sampel.nama,
      snapshot:
        dec.choice === "approve"
          ? { status: "approved", perubahan: dec.catatan || null }
          : dec.choice === "ditahan"
          ? { status: "ditahan", ditahan_note: dec.catatan || null }
          : { status: "rejected", rejection_note: dec.alasan },
      before: { status: sampel.status },
    }).catch(() => {});
  });

  return toProcess;
}

// ── Hapus ─────────────────────────────────────────────────────────────────────
export async function deleteSampel(id) {
  // Catatan: sebelumnya salah target tabel ("produksi_sampel", tidak pernah
  // ada) — bug lama yang membuat tombol Hapus di UI silently no-op karena
  // Supabase mengembalikan error yang tertelan di beberapa caller lama.
  // Tabel yang benar adalah "sampel" (lihat fetchSampels/createSampels di atas).
  const { error } = await supabase.from("sampel").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
