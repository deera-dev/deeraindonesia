import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { buildNomor, zonaHasContent } from "./utils";

export async function fetchSampels() {
  const { data } = await supabase
    .from("sampel")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

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

// Insert tunggal, sudah atomik dari sananya — cuma identitas yang
// diperbaiki (created_by dulu dari userEmail/userName client, sekarang
// dari auth.uid()) — lihat
// supabase/migrations/20261120_produksi_sampel_crud.sql.
export async function createPlanning(entry, bahanFotoUrl, modelFotoUrls, bahanItems, urutan) {
  const nomor = buildNomor();
  const { data, error } = await supabase.rpc("create_sampel_planning", {
    p_nomor: nomor,
    p_nama: entry.nama,
    p_tanggal: entry.tanggal,
    p_bahan_foto_url: bahanFotoUrl || null,
    p_model_foto_urls: modelFotoUrls ?? [],
    p_bahan_items: bahanItems ?? [],
    p_urutan: urutan ?? 0,
    p_is_repeat: !!entry.repeat,
    p_repeat_dari_id: entry.repeat?.id ?? null,
    p_repeat_dari_kode: entry.repeat?.kode ?? null,
  });
  if (error) throw new Error(error.message);

  return data;
}

export async function updatePlanning({ id, nomor, nama, tanggal, modelFotoUrls, bahanItems }) {
  const patch = {
    nama,
    tanggal,
    model_foto: modelFotoUrls ?? [],
    bahan_items: bahanItems ?? [],
    bahan_foto: null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("sampel").update(patch).eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-planning-edit",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: patch,
  }).catch(() => {});
}

// Dulu Promise.all dari N update independen tanpa transaction — sekarang
// 1 RPC atomik.
export async function reorderPlanning(updates) {
  if (!updates?.length) return;
  const { error } = await supabase.rpc("reorder_sampel_planning", { p_updates: updates });
  if (error) throw new Error(error.message);
}

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

export function previousStepPatch(sampel, now = new Date().toISOString()) {
  if (sampel.status === "approved" && sampel.wo_selesai_at) {
    return { step: "approved", patch: { wo_selesai_at: null } };
  }
  if (sampel.status === "approved") {
    const hasFoto = (sampel.foto ?? []).length > 0;
    const base = {
      approved_by: null,
      approved_at: null,
      perubahan: null,
      sesuai_sampel: null,
      wo_selesai_at: null,
    };
    return hasFoto
      ? { step: "draft", patch: { ...base, status: "draft" } }
      : {
          step: "draft",
          patch: { ...base, status: "planning", wo_sampel_at: sampel.wo_sampel_at ?? now },
        };
  }
  if (sampel.status === "draft" || (sampel.status === "planning" && sampel.wo_sampel_at)) {
    return { step: "planning", patch: { status: "planning", wo_sampel_at: null } };
  }
  return null;
}

export async function mundurStepSampel(sampel) {
  const plan = previousStepPatch(sampel);
  if (!plan) return null;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sampel")
    .update({ ...plan.patch, updated_at: now })
    .eq("id", sampel.id);
  if (error) throw error;
  logHistory({
    action: "sampel-mundur-step",
    category: "produksi",
    kode: sampel.nomor,
    nama: sampel.nama,
    snapshot: { step: plan.step },
    before: { status: sampel.status },
  }).catch(() => {});
  return plan.step;
}

export async function setWoSelesai({ id, nomor, nama, selesai }) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sampel")
    .update({ wo_selesai_at: selesai ? now : null, updated_at: now })
    .eq("id", id);
  if (error) throw error;

  logHistory({
    action: selesai ? "sampel-wo-selesai" : "sampel-wo-batal-selesai",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { wo_selesai_at: selesai ? now : null },
  }).catch(() => {});
}

// Update tunggal, sudah atomik dari sananya — cuma identitas yang
// diperbaiki (approved_by dulu dari userEmail client, sekarang dari
// auth.uid()).
export async function approveRepeat({ id, foto, catatan }) {
  const { error } = await supabase.rpc("approve_sampel_repeat", {
    p_id: id,
    p_foto: foto ?? [],
    p_catatan: catatan || null,
  });
  if (error) throw new Error(error.message);
}

// Dulu Promise.all dari N update independen (approve/tahan/reject per
// sampel) tanpa transaction — kalau satu gagal, sisanya sudah ter-commit
// duluan. Sekarang 1 RPC atomik, identitas dari auth.uid(). notify-
// sampel-status TETAP fire-and-forget di luar RPC — lihat
// supabase/migrations/20261120_produksi_sampel_crud.sql.
export async function saveBatchDecisions(decisions, sampelMap, userEmail) {
  const toProcess = Object.entries(decisions).filter(([, d]) => d.choice !== null);
  if (toProcess.length === 0) return toProcess;

  const { error } = await supabase.rpc("save_batch_decisions_sampel", {
    p_decisions: toProcess.map(([id, dec]) => ({
      id,
      choice: dec.choice,
      catatan: dec.catatan || null,
      alasan: dec.alasan || null,
    })),
  });
  if (error) throw new Error(error.message);

  toProcess.forEach(([id, dec]) => {
    const sampel = sampelMap[id];
    if (!sampel) return;

    supabase.functions
      .invoke("notify-sampel-status", {
        body: {
          sampelId: id,
          sampelNomor: sampel.nomor,
          sampelNama: sampel.nama,
          newStatus:
            dec.choice === "approve"
              ? "approved"
              : dec.choice === "ditahan"
                ? "ditahan"
                : "rejected",
          creatorEmail: sampel.created_by,
          actorEmail: userEmail,
        },
      })
      .catch(() => {});
  });

  return toProcess;
}

export async function togglePinned(id, pinned) {
  const { error } = await supabase.from("sampel").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function saveWoDraft({ sampel, sizes, zonaCatatan }) {
  const patch = {
    wo_sizes: sizes ?? [],
    wo_catatan_zona: zonaHasContent(zonaCatatan) ? zonaCatatan : null,
  };
  const { error } = await supabase.from("sampel").update(patch).eq("id", sampel.id);
  if (error) throw error;
}

export async function logWorkOrder({ sampel, sizes, zonaCatatan }) {
  const patch = {
    wo_sizes: sizes ?? [],
    wo_catatan_zona: zonaHasContent(zonaCatatan) ? zonaCatatan : null,
  };
  if (sampel.status === "planning" && !sampel.wo_sampel_at) {
    patch.wo_sampel_at = new Date().toISOString();
  }
  const { error } = await supabase.from("sampel").update(patch).eq("id", sampel.id);
  if (error) throw error;

  await logHistory({
    action: "sampel-wo-buat",
    category: "produksi",
    kode: sampel.nomor,
    nama: sampel.nama,
    snapshot: { sizes: sizes ?? [], zonaCatatan: patch.wo_catatan_zona },
  });
}

export async function deleteSampel(id) {
  const { error } = await supabase.from("sampel").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
