export interface HistoryEntry {
  id: string;
  action: string;
  category: string;
  kode: string | null;
  nama: string | null;
  snapshot: Record<string, unknown> | null;
  before_snapshot: Record<string, unknown> | null;
  user_email: string | null;
  user_name: string | null;
  changed_at: string;
}

export interface LogHistoryInput {
  action: string;
  category?: string;
  kode?: string | null;
  nama?: string | null;
  snapshot?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;
}

export interface HistoryFilter {
  dateFrom?: string | null;
  dateTo?: string | null;
  category?: string;
}

export interface HistorySnapshotVariant {
  size: string;
  harga: number;
}

export interface HistorySnapshotTransferItem {
  kode: string;
  size?: string;
  warna?: string;
  qty?: number;
}

export interface HistorySnapshotStokRow {
  size: string;
  warna?: string;
  gudang?: number;
  cideng?: number;
  tegalgubug?: number;
}

export interface HistorySnapshotBatchSize {
  size: string;
  warna?: Array<{ warna: string; qty: number }>;
}

export interface HistorySnapshotBahanItem {
  nama_bahan: string;
  qty_per_baju: number;
  satuan: string;
}

// Bentuk union semua jsonb snapshot/before_snapshot dari semua kategori
// aksi (produk/transfer/stok/produksi/pelanggan) — hanya dipakai utk
// display diff/detail di HistoryDiffs & HistoryDetailModal, bukan
// bentuk tabel/RPC manapun, jadi aman di-union-kan bebas.
export interface HistorySnapshot {
  nama?: string;
  no_hp?: string;
  alamat?: string;
  bahan?: string;
  hpp?: number | null;
  variants?: HistorySnapshotVariant[];
  warna?: string[];
  from_location?: string;
  to_location?: string;
  items?: HistorySnapshotTransferItem[];
  status?: string;
  notes?: string;
  approved_by?: string;
  rejected_by?: string;
  rows?: HistorySnapshotStokRow[];
  perubahan?: string;
  rejection_note?: string;
  nomor?: string;
  tanggal?: string;
  batch_no?: string;
  total_kain?: number;
  catatan?: string;
  sizes?: HistorySnapshotBatchSize[];
  total_hpp?: number | null;
  bahan_items?: HistorySnapshotBahanItem[];
  bulk?: number;
  nama_bahan?: string;
  kode_bahan?: string;
  qty?: number;
  satuan?: string;
  total_harga?: number;
  nama_supplier?: string;
  nama_pemberi?: string;
  sumber?: string;
  [key: string]: unknown;
}
