export type BahanTable = "bahan_pembelian" | "bahan_pinjam";
export type StatusBayar = "lunas" | "belum";

export interface BahanItemRow {
  id: string;
  nama_bahan: string;
  kode_bahan?: string | null;
  motif?: string | null;
  satuan: string;
  jumlah: number;
  harga_satuan?: number | null;
  total_harga: number;
  tanggal: string;
  jatuh_tempo?: string | null;
  status_bayar: StatusBayar;
  nama_pemberi?: string | null;
  created_at?: string;
}

export interface SaveBahanItemArgs {
  table: BahanTable;
  payload: Partial<BahanItemRow> | Partial<BahanItemRow>[];
  editing?: BahanItemRow | null;
  meta?: Record<string, unknown>;
  activeTab?: string;
}

export interface DeleteBahanItemArgs {
  table: BahanTable;
  item: BahanItemRow;
  activeTab?: string;
}

export interface StokBahanRow {
  nama_bahan: string;
  satuan: string;
  stok_sisa: number;
  total_masuk: number;
  total_keluar: number;
}

export type DupeGroup = BahanItemRow[];

export interface TagihanGroup {
  bulan: string;
  total: number;
  items: BahanItemRow[];
}
