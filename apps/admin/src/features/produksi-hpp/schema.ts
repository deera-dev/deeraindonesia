export type BahanJenis = "motif" | "tambahan" | "polos";

export interface WarnaQty {
  warna: string;
  qty: number | string;
}

export interface KancingExtra {
  label?: string;
  qty: number;
  harga_per: number;
  satuan?: string;
}

export interface BahanItem {
  nama_bahan: string;
  kode_bahan?: string | null;
  satuan: string;
  satuan_ukur?: string;
  harga_satuan: number | string;
  qty_dipakai?: number | string;
  qty_per_baju?: number | string;
  untuk_n_baju?: number;
  jenis?: BahanJenis;
  warna_qtys?: WarnaQty[];
}

export interface HppTemplate {
  id: string;
  kode_produk: string;
  bahan_items: BahanItem[];
  upah_jahit: number;
  bordir: number;
  biaya_studio: number;
  jumlah_baju_studio?: number | string;
  kancing_qty: number;
  kancing_extra?: KancingExtra[];
  catatan?: string | null;
  config_snapshot?: Record<string, unknown>;
  total_hpp: number;
  updated_at?: string;
  updated_by?: string | null;
}

export type HppConfigMap = Record<string, number>;

export interface HppConfigRow {
  key: string;
  label: string;
  nilai: number;
  keterangan?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

export interface BahanOption {
  id: string;
  nama_bahan: string;
  kode_bahan?: string | null;
  satuan: string;
  harga_satuan: number;
  jumlah: number;
  _type: "beli" | "pinjam";
  _label: string;
}

export interface SaveHppTemplatePayload {
  kode_produk: string;
  bahan_items: BahanItem[];
  upah_jahit: number;
  bordir: number;
  biaya_studio: number;
  jumlah_baju_studio?: number | string;
  kancing_qty: number;
  kancing_extra?: KancingExtra[];
  catatan?: string | null;
  config_snapshot?: Record<string, unknown>;
  total_hpp: number;
}

export interface DeleteHppTemplateTarget {
  id: string;
  kode_produk?: string | null;
  total_hpp?: number;
}

export interface ProduksiBatchLike {
  kode_produk?: string | null;
  batch_no?: string | null;
  created_at?: string | null;
  sizes?: Array<{ warna?: Array<{ qty?: number | string }> }>;
}

export interface HppFilter {
  hppMin: string | number;
  hppMax: string | number;
  sort: string;
}
