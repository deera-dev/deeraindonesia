export interface CmtJahitKirimRow {
  id: string;
  kirim_no: string;
  nama_vendor: string;
  tanggal_kirim: string;
  estimasi_selesai: string | null;
  tanggal_setor: string | null;
  harga_upah: number;
  kode_produk: string;
  nama_produk: string;
  size: string;
  warna: string;
  qty: number;
  qty_setor: number | null;
  status: "dikirim" | "setor" | "selesai" | "batal";
  catatan: string | null;
  created_at: string;
}

export interface JahitCardAvailable {
  id: string;
  kode_produk: string;
  nama_produk: string;
  size: string;
  warna: string;
  qty: number;
}

export interface CmtSetoranFullRow {
  id: string;
  nama_vendor: string;
  kode_produk: string;
  nama_produk: string | null;
  tanggal_setor: string;
  items: SetoranFullItem[];
  harga_upah: number;
  catatan: string | null;
  created_at: string;
}

export interface SetoranFullItem {
  size: string;
  warna: string;
  qty: number | string;
}

export interface CmtFullKirimRow {
  id: string;
  nama_vendor: string;
  tanggal_kirim: string;
  estimasi_selesai: string | null;
  bahan: BahanKirimItem[];
  catatan: string | null;
  created_at: string;
}

export interface BahanKirimItem {
  nama_bahan: string;
  kode_bahan: string | null;
  satuan: string;
  jumlah: number | string;
}

export interface CardGroup {
  kode_produk: string;
  nama_produk: string;
  size: string;
  warna: string;
  qty: number;
  cardIds: string[];
}

export interface KirimGroup {
  kirimNo: string;
  namaVendor: string;
  tanggalKirim: string;
  estimasiSelesai: string | null;
  tanggalSetor: string | null;
  hargaUpah: number;
  rows: CmtJahitKirimRow[];
  status: "dikirim" | "setor" | "selesai" | "batal";
  totalQtyKirim: number;
  totalQtySetor: number;
}

export interface KodeGroup {
  kode: string;
  namaProduk: string;
  rows: CmtJahitKirimRow[];
  totalQty: number;
}
