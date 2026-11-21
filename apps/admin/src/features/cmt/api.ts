import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import type {
  BahanKirimItem,
  CmtFullKirimRow,
  CmtJahitKirimRow,
  CmtSetoranFullRow,
  JahitCardAvailable,
  SetoranFullItem,
} from "./schema";
import { groupCardsByKodeSizeWarna } from "./utils";

export function generateKirimNo(): string {
  const now = new Date();
  const d = now.toISOString().split("T")[0]!.replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `CMT-${d}-${rand}`;
}

export async function fetchCmtJahitKirim(): Promise<CmtJahitKirimRow[]> {
  const { data, error } = await supabase
    .from("cmt_jahit_kirim")
    .select("*")
    .neq("status", "selesai")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAvailablePotonganByKode(
  kode: string | null | undefined,
): Promise<JahitCardAvailable[]> {
  if (!kode) return [];
  const { data, error } = await supabase
    .from("jahit_cards")
    .select("id, kode_produk, nama_produk, size, warna, qty")
    .eq("kode_produk", kode)
    .is("cmt_jahit_kirim_id", null)
    .neq("status", "done")
    .order("size");
  if (error) throw error;
  return data ?? [];
}

export async function updateHargaUpahKirim({
  kirimNo,
  hargaUpah,
}: {
  kirimNo: string;
  hargaUpah: number | string;
}): Promise<void> {
  const { error } = await supabase
    .from("cmt_jahit_kirim")
    .update({ harga_upah: Number(hargaUpah) || 0, updated_at: new Date().toISOString() })
    .eq("kirim_no", kirimNo);
  if (error) throw error;

  logHistory({
    action: "cmt-jahit-upah",
    category: "produksi",
    kode: kirimNo,
    nama: `Upah/pcs diisi ${Number(hargaUpah) || 0}`,
    snapshot: { kirim_no: kirimNo, harga_upah: Number(hargaUpah) || 0 },
  }).catch(() => {});
}

export async function createKirimCmtJahit({
  namaVendor,
  tanggalKirim,
  estimasiSelesai,
  hargaUpah,
  cards,
  catatan,
}: {
  namaVendor: string;
  tanggalKirim: string;
  estimasiSelesai?: string | null;
  hargaUpah?: number | string;
  cards: JahitCardAvailable[];
  catatan?: string | null;
}): Promise<{ kirim_no: string }> {
  if (!namaVendor?.trim()) throw new Error("Nama vendor wajib diisi.");
  if (!cards?.length) throw new Error("Tambahkan minimal 1 produk.");

  const groups = groupCardsByKodeSizeWarna(cards);
  const kirimNo = generateKirimNo();

  const { error } = await supabase.rpc("create_kirim_cmt_jahit", {
    p_kirim_no: kirimNo,
    p_nama_vendor: namaVendor.trim(),
    p_tanggal_kirim: tanggalKirim,
    p_estimasi_selesai: estimasiSelesai || null,
    p_harga_upah: Number(hargaUpah) || 0,
    p_catatan: catatan || null,
    p_groups: groups,
  });
  if (error) throw new Error(error.message);

  return { kirim_no: kirimNo };
}

export async function setorKirimCmtJahit({
  kirimNo,
  tanggalSetor,
  itemsSetor,
  catatan,
}: {
  kirimNo: string;
  tanggalSetor: string;
  itemsSetor: Array<{ id: string; qty_setor: number | string }>;
  catatan?: string | null;
}): Promise<void> {
  if (!itemsSetor?.length) throw new Error("Tidak ada baris untuk disetor.");

  const { error } = await supabase.rpc("setor_kirim_cmt_jahit", {
    p_kirim_no: kirimNo,
    p_tanggal_setor: tanggalSetor,
    p_items: itemsSetor,
    p_catatan: catatan || null,
  });
  if (error) throw new Error(error.message);
}

export async function batalKirimCmtJahit({
  kirimNo,
  ids,
}: {
  kirimNo: string;
  ids: string[];
}): Promise<void> {
  if (!ids?.length) return;

  const { error } = await supabase.rpc("batal_kirim_cmt_jahit", {
    p_kirim_no: kirimNo,
    p_ids: ids,
  });
  if (error) throw new Error(error.message);
}

export async function fetchCmtSetoranFull(): Promise<CmtSetoranFullRow[]> {
  const { data, error } = await supabase
    .from("cmt_setoran_full")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createSetoranFull({
  namaVendor,
  kodeProduk,
  namaProduk,
  tanggalSetor,
  items,
  hargaUpah,
  catatan,
}: {
  namaVendor: string;
  kodeProduk: string;
  namaProduk?: string | null;
  tanggalSetor: string;
  items: SetoranFullItem[];
  hargaUpah?: number | string;
  catatan?: string | null;
}): Promise<CmtSetoranFullRow> {
  if (!namaVendor?.trim()) throw new Error("Nama vendor wajib diisi.");
  if (!kodeProduk?.trim()) throw new Error("Kode produk wajib diisi.");
  const cleanItems = (items ?? []).filter((it) => it.size && Number(it.qty) > 0);
  if (!cleanItems.length) throw new Error("Isi minimal 1 baris size/warna dengan qty > 0.");

  const { data, error } = await supabase.rpc("create_setoran_full", {
    p_nama_vendor: namaVendor.trim(),
    p_kode_produk: kodeProduk.trim(),
    p_nama_produk: namaProduk || null,
    p_tanggal_setor: tanggalSetor,
    p_items: cleanItems,
    p_harga_upah: Number(hargaUpah) || 0,
    p_catatan: catatan || null,
  });
  if (error) throw new Error(error.message);

  return data;
}

export async function fetchCmtFullKirim(): Promise<CmtFullKirimRow[]> {
  const { data, error } = await supabase
    .from("cmt_full_kirim")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createCmtFullKirim({
  namaVendor,
  tanggalKirim,
  estimasiSelesai,
  bahan,
  catatan,
}: {
  namaVendor: string;
  tanggalKirim: string;
  estimasiSelesai?: string | null;
  bahan: BahanKirimItem[];
  catatan?: string | null;
}): Promise<CmtFullKirimRow> {
  if (!namaVendor?.trim()) throw new Error("Nama vendor wajib diisi.");
  const cleanBahan = (bahan ?? [])
    .filter((b) => b.nama_bahan?.trim() && Number(b.jumlah) > 0)
    .map((b) => ({
      nama_bahan: b.nama_bahan.trim(),
      kode_bahan: b.kode_bahan?.trim() || null,
      satuan: b.satuan || "yard",
      jumlah: Number(b.jumlah) || 0,
    }));
  if (!cleanBahan.length) throw new Error("Isi minimal 1 bahan dengan jumlah > 0.");

  const { data, error } = await supabase.rpc("create_cmt_full_kirim", {
    p_nama_vendor: namaVendor.trim(),
    p_tanggal_kirim: tanggalKirim,
    p_estimasi_selesai: estimasiSelesai || null,
    p_bahan: cleanBahan,
    p_catatan: catatan || null,
  });
  if (error) throw new Error(error.message);

  return data;
}

export async function deleteCmtFullKirim(id: string): Promise<void> {
  const { error } = await supabase.from("cmt_full_kirim").delete().eq("id", id);
  if (error) throw error;
}
