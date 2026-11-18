import { supabase } from "@deera/shared/lib/supabase";
import { displayName } from "@deera/shared/features/auth/api";
import { logHistory } from "../history/api";

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

export async function createKirimCmtJahit({
  namaVendor,
  tanggalKirim,
  estimasiSelesai,
  hargaUpah,
  items,
  catatan,
  user,
}) {
  if (!namaVendor?.trim()) throw new Error("Nama vendor wajib diisi.");
  if (!items?.length) throw new Error("Tambahkan minimal 1 produk.");

  const kirimNo = generateKirimNo();
  const rows = items.map((it) => ({
    kirim_no: kirimNo,
    nama_vendor: namaVendor.trim(),
    kode_produk: it.kode_produk,
    nama_produk: it.nama_produk ?? null,
    size: it.size,
    warna: it.warna || "_",
    qty: Number(it.qty) || 0,
    harga_upah: Number(hargaUpah) || 0,
    status: "dikirim",
    tanggal_kirim: tanggalKirim,
    estimasi_selesai: estimasiSelesai || null,
    catatan: catatan || null,
    created_by: user?.email ?? null,
    created_by_name: displayName(user),
  }));

  const { data, error } = await supabase.from("cmt_jahit_kirim").insert(rows).select();
  if (error) throw error;

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  logHistory({
    action: "cmt-jahit-kirim",
    category: "produksi",
    kode: kirimNo,
    nama: `${namaVendor.trim()} · ${totalQty} pcs`,
    snapshot: { kirim_no: kirimNo, nama_vendor: namaVendor.trim(), items },
  }).catch(() => {});

  return data ?? rows;
}

export async function setorKirimCmtJahit({ kirimNo, tanggalSetor, itemsSetor, catatan }) {
  if (!itemsSetor?.length) throw new Error("Tidak ada baris untuk disetor.");
  const now = new Date().toISOString();
  for (const it of itemsSetor) {
    const payload = {
      status: "setor",
      qty_setor: Number(it.qtySetor) || 0,
      tanggal_setor: tanggalSetor,
      updated_at: now,
    };
    if (catatan) payload.catatan = catatan;
    const { error } = await supabase.from("cmt_jahit_kirim").update(payload).eq("id", it.id);
    if (error) throw error;
  }

  logHistory({
    action: "cmt-jahit-setor",
    category: "produksi",
    kode: kirimNo,
    nama: `Setor ${itemsSetor.length} baris`,
    snapshot: { kirim_no: kirimNo, items: itemsSetor },
  }).catch(() => {});
}

export async function batalKirimCmtJahit({ kirimNo, ids }) {
  if (!ids?.length) return;
  const { error } = await supabase
    .from("cmt_jahit_kirim")
    .update({ status: "batal", updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;

  logHistory({
    action: "cmt-jahit-batal",
    category: "produksi",
    kode: kirimNo,
    nama: "Dibatalkan",
    snapshot: { kirim_no: kirimNo, ids },
  }).catch(() => {});
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

export async function createSetoranFull({
  namaVendor,
  kodeProduk,
  namaProduk,
  tanggalSetor,
  items,
  hargaUpah,
  catatan,
  user,
}) {
  if (!namaVendor?.trim()) throw new Error("Nama vendor wajib diisi.");
  if (!kodeProduk?.trim()) throw new Error("Kode produk wajib diisi.");
  const cleanItems = (items ?? []).filter((it) => it.size && Number(it.qty) > 0);
  if (!cleanItems.length) throw new Error("Isi minimal 1 baris size/warna dengan qty > 0.");

  const totalQty = cleanItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const totalUpah = totalQty * (Number(hargaUpah) || 0);

  const row = {
    nama_vendor: namaVendor.trim(),
    kode_produk: kodeProduk.trim(),
    nama_produk: namaProduk || null,
    tanggal_setor: tanggalSetor,
    items: cleanItems,
    harga_upah: Number(hargaUpah) || 0,
    total_upah: totalUpah,
    catatan: catatan || null,
    created_by: user?.email ?? null,
    created_by_name: displayName(user),
  };

  const { data, error } = await supabase.from("cmt_setoran_full").insert(row).select().single();
  if (error) throw error;

  for (const it of cleanItems) {
    const warna = it.warna || "_";
    const qty = Number(it.qty) || 0;
    const { error: incErr } = await supabase.rpc("increment_stok_gudang", {
      p_kode: row.kode_produk,
      p_size: it.size,
      p_warna: warna,
      p_delta: qty,
    });
    if (incErr) throw incErr;

    const { error: logErr } = await supabase.from("stok_masuk_log").insert({
      kode: row.kode_produk,
      size: it.size,
      warna,
      qty_kartu: qty,
      stok_sebelum: 0,
      terjual_sebelum: 0,
      qty_ditambahkan: qty,
      cmt_setoran_full_id: data.id,
      created_by: user?.email ?? null,
      created_by_name: displayName(user),
    });
    if (logErr) throw logErr;
  }

  logHistory({
    action: "cmt-full-setor",
    category: "produksi",
    kode: row.kode_produk,
    nama: `${namaVendor.trim()} · ${totalQty} pcs`,
    snapshot: row,
  }).catch(() => {});

  return data;
}
