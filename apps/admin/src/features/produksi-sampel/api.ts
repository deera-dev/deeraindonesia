import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import type {
  BahanItemFoto,
  Decision,
  DecisionsMap,
  PlanningEntry,
  ReorderUpdate,
  Sampel,
  SampelMap,
  WoSizeEntry,
  ZonaCatatan,
} from "./schema";
import { buildNomor, zonaHasContent } from "./utils";

export async function fetchSampels(): Promise<Sampel[]> {
  const { data } = await supabase
    .from("sampel")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateSampel({
  id,
  nomor,
  nama,
  tanggal,
  foto,
}: {
  id: string;
  nomor: string;
  nama: string;
  tanggal: string | null;
  foto: string[];
}): Promise<void> {
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
  entry: PlanningEntry,
  bahanFotoUrl: string | null | undefined,
  modelFotoUrls: string[] | undefined,
  bahanItems: BahanItemFoto[] | undefined,
  urutan: number | undefined,
): Promise<Sampel> {
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

export async function updatePlanning({
  id,
  nomor,
  nama,
  tanggal,
  modelFotoUrls,
  bahanItems,
}: {
  id: string;
  nomor: string;
  nama: string;
  tanggal: string;
  modelFotoUrls?: string[];
  bahanItems?: BahanItemFoto[];
}): Promise<void> {
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

export async function reorderPlanning(updates: ReorderUpdate[]): Promise<void> {
  if (!updates?.length) return;
  const { error } = await supabase.rpc("reorder_sampel_planning", { p_updates: updates });
  if (error) throw new Error(error.message);
}

export async function markSampelDibuat({
  id,
  nomor,
  nama,
  foto,
}: {
  id: string;
  nomor: string;
  nama: string;
  foto: string[];
}): Promise<void> {
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

export interface PreviousStepPlan {
  step: "approved" | "draft" | "planning";
  patch: Record<string, unknown>;
}

export function previousStepPatch(
  sampel: Sampel,
  now: string = new Date().toISOString(),
): PreviousStepPlan | null {
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

export async function mundurStepSampel(sampel: Sampel): Promise<PreviousStepPlan["step"] | null> {
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

export async function setWoSelesai({
  id,
  nomor,
  nama,
  selesai,
}: {
  id: string;
  nomor: string;
  nama: string;
  selesai: boolean;
}): Promise<void> {
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

export async function approveRepeat({
  id,
  foto,
  catatan,
}: {
  id: string;
  foto?: string[];
  catatan?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("approve_sampel_repeat", {
    p_id: id,
    p_foto: foto ?? [],
    p_catatan: catatan || null,
  });
  if (error) throw new Error(error.message);
}

export async function saveBatchDecisions(
  decisions: DecisionsMap,
  sampelMap: SampelMap,
  userEmail: string | null | undefined,
): Promise<Array<[string, Decision]>> {
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

export async function togglePinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("sampel").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function saveWoDraft({
  sampel,
  sizes,
  zonaCatatan,
}: {
  sampel: Sampel;
  sizes?: WoSizeEntry[];
  zonaCatatan?: ZonaCatatan | null;
}): Promise<void> {
  const patch = {
    wo_sizes: sizes ?? [],
    wo_catatan_zona: zonaHasContent(zonaCatatan) ? zonaCatatan : null,
  };
  const { error } = await supabase.from("sampel").update(patch).eq("id", sampel.id);
  if (error) throw error;
}

export async function logWorkOrder({
  sampel,
  sizes,
  zonaCatatan,
}: {
  sampel: Sampel;
  sizes?: WoSizeEntry[];
  zonaCatatan?: ZonaCatatan | null;
}): Promise<void> {
  const patch: {
    wo_sizes: WoSizeEntry[];
    wo_catatan_zona: ZonaCatatan | null;
    wo_sampel_at?: string;
  } = {
    wo_sizes: sizes ?? [],
    wo_catatan_zona: zonaHasContent(zonaCatatan) ? (zonaCatatan ?? null) : null,
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

export async function deleteSampel(id: string): Promise<void> {
  const { error } = await supabase.from("sampel").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
