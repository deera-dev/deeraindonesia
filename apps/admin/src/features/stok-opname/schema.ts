export type LocKey = "gudang" | "cideng" | "tegalgubug" | "ngorder";

export interface StokWarnaRow {
  id: string | number;
  kode: string;
  size: string;
  warna: string;
  gudang: number;
  cideng: number;
  tegalgubug: number;
  ngorder?: number;
  updated_at?: string;
}

export interface JahitDikerjakanRow {
  kode: string;
  size: string;
  total_dikerjakan: number;
}

export interface BukuEntry {
  expected?: number;
  sold?: number;
  dikirim?: number;
  seharusnya: number;
  byLocation?: Record<string, { seharusnya: number }>;
}

export interface BukuPotonganData {
  rows: Record<string, BukuEntry>;
  sizes: Record<string, BukuEntry>;
  kodes: Record<string, BukuEntry>;
}

export type ChangedValues = Partial<Record<LocKey, number>>;
export type ChangedMap = Record<string, ChangedValues>;

export interface SaveStokOpnameParams {
  changed: ChangedMap;
  stokRows: StokWarnaRow[];
}

export interface OverflowAdjustment {
  warna: string;
  gudang_to: number;
}

export interface OverflowSizePlan {
  size: string;
  adjustments: OverflowAdjustment[];
}

export interface OverflowPlan {
  overflow: boolean;
  sizes: OverflowSizePlan[];
}

export interface OverflowChangeInput {
  size: string;
  warna: string;
  next: number;
}

export interface PlanOpnameOverflowParams {
  kode: string;
  loc: string;
  changes: OverflowChangeInput[];
}

export interface OverItem {
  size: string;
  total_after: number;
  sold: number;
  produced: number;
  excess: number;
}

export interface CheckStokSemuaResult {
  over: OverItem[];
}

export interface CheckStokSemuaRow {
  size: string;
  warna: string;
  gudang: number;
  cideng: number;
  tegalgubug: number;
  ngorder?: number;
}

export interface CheckStokSemuaParams {
  kode: string;
  rows: CheckStokSemuaRow[];
}
