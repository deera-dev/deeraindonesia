export interface BahanDipakaiItem {
  nama_bahan: string;
  kode_bahan: string;
  satuan: string;
  jumlah: number;
}

export interface HppTemplateBahanItem {
  nama_bahan: string;
  kode_bahan?: string | null;
  satuan: string;
  qty_per_baju: number | string;
}

export interface HppTemplate {
  id: string;
  kode_produk: string;
  total_hpp: number;
  bahan_items: HppTemplateBahanItem[];
  upah_jahit?: number;
  bordir?: number;
  biaya_studio?: number;
  kancing_qty?: number;
  config_snapshot?: Record<string, unknown>;
  catatan?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

export interface ProduksiBatch {
  id: string;
  batch_no: string;
  kode_produk: string;
  nama_produk: string;
  tanggal_produksi: string;
  total_kain: number;
  sizes: BatchSize[];
  bahan_dipakai: BahanDipakaiItem[];
  hpp_snapshot: Record<string, unknown> | null;
  hpp_per_item: number;
  upah_jahit?: number;
  tukang_potong_id?: string | null;
  tukang_potong_nama?: string | null;
  catatan?: string | null;
  created_at: string;
}

export interface BatchSizeWarna {
  warna: string;
  qty: number;
}

export interface BatchSize {
  size: string;
  warna: BatchSizeWarna[];
}

export interface KaryawanPotong {
  id: string;
  nama: string;
}

export interface ActiveVariant {
  size: string;
  ld: number;
  pb: number;
}

export interface BatchEntry {
  kode: string;
  nama: string;
  bahan?: string | null;
  activeVariants: ActiveVariant[];
  warnaList: string[];
  sizes: BatchSize[];
  totalKain: number;
  template: HppTemplate | null;
  batchNo: string;
  tanggal: string;
  catatan?: string | null;
  upahJahit?: number | string;
  tukangPotongId?: string | null;
  tukangPotongNama?: string | null;
}

export interface SharedBatchFields {
  tanggal: string;
  catatan?: string | null;
  upahJahit?: number | string;
  tukangPotongId?: string | null;
  tukangPotongNama?: string | null;
}

export interface UpdateBatchPayload {
  initial: ProduksiBatch;
  kode: string;
  nama: string;
  tanggal: string;
  totalKain: number;
  sizes: BatchSize[];
  bahanDipakai: BahanDipakaiItem[];
  batchNo: string;
  catatan?: string | null;
  upahJahit?: number | string;
  tukangPotongId?: string | null;
  tukangPotongNama?: string | null;
}

export interface BatchFilter {
  tanggalMin: string;
  tanggalMax: string;
  potongMin: string | number;
  potongMax: string | number;
  hppMin: string | number;
  hppMax: string | number;
  upahJahitMin: string | number;
  upahJahitMax: string | number;
  bahanStatus: string;
  sort: string;
}
