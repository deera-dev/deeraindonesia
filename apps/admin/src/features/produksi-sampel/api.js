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

export async function createPlanning(
  entry,
  bahanFotoUrl,
  modelFotoUrls,
  bahanItems,
  urutan,
  { userEmail, userName },
) {
  const insert = {
    nama: entry.nama,
    tanggal: entry.tanggal,
    foto: [],
    bahan_foto: bahanFotoUrl || null,
    model_foto: modelFotoUrls ?? [],
    bahan_items: bahanItems ?? [],
    urutan: urutan ?? 0,
    nomor: buildNomor(),
    ...(entry.repeat
      ? { is_repeat: true, repeat_dari_id: entry.repeat.id ?? null, repeat_dari_kode: entry.repeat.kode ?? null }
      : {}),
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

export async function reorderPlanning(updates) {
  await Promise.all(
    (updates ?? []).map(({ id, urutan }) =>
      supabase.from("sampel").update({ urutan }).eq("id", id).throwOnError(),
    ),
  );
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
    const base = { approved_by: null, approved_at: null, perubahan: null, sesuai_sampel: null, wo_selesai_at: null };
    return hasFoto
      ? { step: "draft", patch: { ...base, status: "draft" } }
      : { step: "draft", patch: { ...base, status: "planning", wo_sampel_at: sampel.wo_sampel_at ?? now } };
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

export async function approveRepeat({ id, nomor, nama, foto, catatan }, { userEmail }) {
  const now = new Date().toISOString();
  const payload = {
    status: "approved",
    foto: foto ?? [],
    sesuai_sampel: !catatan,
    perubahan: catatan || null,
    approved_by: userEmail,
    approved_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("sampel").update(payload).eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-approve-repeat",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { status: "approved", repeat: true, perubahan: catatan || null },
    before: { status: "planning" },
  }).catch(() => {});
}

export async function lanjutKeWorkOrder({ id, nomor, nama }, { userEmail }) {
  const now = new Date().toISOString();
  const payload = {
    status: "approved",
    sesuai_sampel: true,
    approved_by: userEmail,
    approved_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("sampel").update(payload).eq("id", id);
  if (error) throw error;

  logHistory({
    action: "sampel-lanjut-wo",
    category: "produksi",
    kode: nomor,
    nama,
    snapshot: { status: "approved", tanpa_foto_sampel: true },
    before: { status: "planning" },
  }).catch(() => {});

  return { approved_by: userEmail, approved_at: now };
}

export async function createSampels(entries, urlsArr, { userEmail, userName }) {
  let batchId = null;
  try {
    batchId = crypto.randomUUID();
  } catch {
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

    supabase.functions
      .invoke("notify-sampel-status", {
        body: {
          sampelId: id,
          sampelNomor: sampel.nomor,
          sampelNama: sampel.nama,
          newStatus:
            dec.choice === "approve" ? "approved" : dec.choice === "ditahan" ? "ditahan" : "rejected",
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
