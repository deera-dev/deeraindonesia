export type SampelStatus = "planning" | "draft" | "approved" | "ditahan" | "rejected";

export interface BahanItemFoto {
  nama_bahan?: string;
  foto?: string | null;
}

export interface ZonaEntry {
  catatan: string;
  crop: unknown;
  motif: string | null;
  aktif: boolean;
}

export type ZonaCatatan = Record<string, ZonaEntry>;

export interface WoSizeEntry {
  [key: string]: unknown;
}

export interface Sampel {
  id: string;
  nomor: string;
  nama: string;
  tanggal: string | null;
  foto?: string[] | null;
  status: SampelStatus;
  wo_sampel_at?: string | null;
  wo_selesai_at?: string | null;
  wo_sizes?: WoSizeEntry[];
  wo_catatan_zona?: ZonaCatatan | null;
  bahan_foto?: string | null;
  bahan_items?: BahanItemFoto[];
  model_foto?: string[];
  urutan?: number | null;
  created_at?: string;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  perubahan?: string | null;
  sesuai_sampel?: boolean | null;
  pinned?: boolean;
  is_repeat?: boolean;
  repeat_dari_id?: string | null;
  repeat_dari_kode?: string | null;
}

export interface PlanningEntry {
  nama: string;
  tanggal: string;
  repeat?: { id: string; kode: string } | null;
}

export interface ReorderUpdate {
  id: string;
  urutan: number;
}

export type DecisionChoice = "approve" | "ditahan" | "reject";

export interface Decision {
  choice: DecisionChoice | null;
  catatan?: string | null;
  alasan?: string | null;
}

export type DecisionsMap = Record<string, Decision>;
export type SampelMap = Record<string, Sampel>;

export interface WoDraft {
  [key: string]: unknown;
}

export interface HistoryEntryLike {
  changed_at: string;
}

export interface TimelineEntry {
  type: "history";
  at: string;
  raw: HistoryEntryLike;
}
