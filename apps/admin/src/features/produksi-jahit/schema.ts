export type JahitCardStatus = "belum_assign" | "ready_finishing" | "done";

export interface ProduksiBatchInfo {
  tanggal_produksi: string | null;
  upah_jahit: number | null;
  tukang_potong_id: string | null;
  tukang_potong_nama: string | null;
}

export interface JahitCard {
  id: string;
  batch_id: string;
  kode_produk: string;
  nama_produk: string;
  size: string;
  warna: string;
  qty: number;
  status: JahitCardStatus;
  karyawan_id: string | null;
  karyawan_nama: string | null;
  assigned_at: string | null;
  moved_to_progress_at: string | null;
  moved_to_finishing_at: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
  produksi_batch: ProduksiBatchInfo | null;
}

export interface KaryawanJahit {
  id: string;
  nama: string;
}

export interface DoneJahitCardsFilter {
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string;
}

export interface BatchSizeInput {
  size: string;
  warna?: Array<{ warna: string; qty: number | string }>;
}

export interface KodeGroup {
  kode: string;
  nama: string;
  cards: JahitCard[];
  totalQty: number;
}
