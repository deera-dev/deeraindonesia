import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { groupCardsByKodeSizeWarna } from "./utils";

export function generateKirimNo() {
  const now = new Date();
  const d = now.toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `CMT-${d}-${rand}`;
}

export async function fetchCmtJahitKirim() {
  const { data, error } = await supabase
    .from("cmt_jahit_kirim")
    .select("*")
    .neq("status", "selesai")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Buku potongan (jahit_cards) yang masih bisa dikirim ke CMT utk kode ini
// -- belum pernah dikirim ke CMT (cmt_jahit_kirim_id kosong) & belum
// selesai/diserap jadi stok. Admin TIDAK pilih warna/qty manual lagi --
// semua warna & qty WAJIB ikut apa yang sudah tercatat di sini (lihat
// KirimForm.jsx).
export async function fetchAvailablePotonganByKode(kode) {
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

// Upah/pcs bisa diisi belakangan (opsional saat Kirim, lihat KirimForm.jsx)
// -- ini aksi utk mengisi/mengoreksi upah setelah kirim dibuat, berlaku
// utk semua baris kirim_no itu sekaligus (satu kirim = satu kesepakatan
// harga dgn vendor).
export async function updateHargaUpahKirim({ kirimNo, hargaUpah }) {
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

// Dulu insert cmt_jahit_kirim (N baris) lalu loop update jahit_cards
// (link per grup) — 2 jenis tulis terpisah tanpa transaction. created_by
// juga dulu dari objek `user` client, bisa dipalsukan. Sekarang 1 RPC
// atomik (create_kirim_cmt_jahit), identitas dari auth.uid() -> profiles
// — lihat supabase/migrations/20261120_cmt_crud.sql.
export async function createKirimCmtJahit({
  namaVendor,
  tanggalKirim,
  estimasiSelesai,
  hargaUpah,
  cards,
  catatan,
}) {
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

// Dulu loop update per baris tanpa transaction — sebagian baris bisa
// jadi "setor" sementara sisanya gagal. Sekarang 1 RPC atomik.
export async function setorKirimCmtJahit({ kirimNo, tanggalSetor, itemsSetor, catatan }) {
  if (!itemsSetor?.length) throw new Error("Tidak ada baris untuk disetor.");

  const { error } = await supabase.rpc("setor_kirim_cmt_jahit", {
    p_kirim_no: kirimNo,
    p_tanggal_setor: tanggalSetor,
    p_items: itemsSetor,
    p_catatan: catatan || null,
  });
  if (error) throw new Error(error.message);
}

// Dulu update cmt_jahit_kirim (status) lalu update jahit_cards (lepas
// link) — 2 langkah terpisah tanpa transaction. Sekarang 1 RPC atomik.
export async function batalKirimCmtJahit({ kirimNo, ids }) {
  if (!ids?.length) return;

  const { error } = await supabase.rpc("batal_kirim_cmt_jahit", {
    p_kirim_no: kirimNo,
    p_ids: ids,
  });
  if (error) throw new Error(error.message);
}

export async function fetchCmtSetoranFull() {
  const { data, error } = await supabase
    .from("cmt_setoran_full")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// Dulu insert cmt_setoran_full lalu loop (increment_stok_gudang + insert
// stok_masuk_log) per item, tanpa transaction — paling berisiko di file
// ini karena nyentuh stok produksi langsung (bisa nambah stok setengah
// kalau gagal di tengah loop). Sekarang 1 RPC atomik, identitas dari
// auth.uid().
export async function createSetoranFull({
  namaVendor,
  kodeProduk,
  namaProduk,
  tanggalSetor,
  items,
  hargaUpah,
  catatan,
}) {
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

// CMT Full — tahap "Kirim Bahan": bahan mentah ke vendor SEBELUM ada kode
// produk (kode/breakdown baru diisi nanti pas setor, lihat
// createSetoranFull di atas). Jadi di sini cuma catat bahan + jumlah
// yard, TANPA kode produk sama sekali.
export async function fetchCmtFullKirim() {
  const { data, error } = await supabase
    .from("cmt_full_kirim")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// Insert tunggal, sudah atomik dari sananya — cuma identitas yang
// diperbaiki (created_by dulu dari objek `user` client, sekarang dari
// auth.uid()).
export async function createCmtFullKirim({
  namaVendor,
  tanggalKirim,
  estimasiSelesai,
  bahan,
  catatan,
}) {
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

export async function deleteCmtFullKirim(id) {
  const { error } = await supabase.from("cmt_full_kirim").delete().eq("id", id);
  if (error) throw error;
}
