/**
 * features/pelanggan/api.js — Raw I/O (Supabase + cache Dexie) untuk CRUD
 * pelanggan. Tidak ada React di sini. Offline-first: tulis ke Supabase dulu
 * kalau online, baru update cache Dexie lokal; tiap mutasi tercatat ke log
 * audit bersama lewat `logActivity` (cross-feature, same-layer import dari
 * ../riwayat/api — pola yang sama dengan apps/admin/features/produksi-sampel
 * yang mengimpor ../history/api).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { db } from "../../lib/db";
import { logActivity } from "../riwayat/api";

// Riwayat transaksi (sale & retur) milik satu pelanggan, terbaru dulu.
// SENGAJA fetch LANGSUNG dari Supabase (bukan cache Dexie `db.sales`, yang
// cuma berisi rentang tanggal yang pernah di-sync perangkat ini lewat
// syncSalesForRange — lihat lib/sync.js) — supaya pencarian transaksi LAMA
// tetap akurat walau belum pernah dibuka di device ini sebelumnya. Sama
// pola dengan apps/admin/src/features/pelanggan/api.js.
//
// Kolom `stok_adjustments` WAJIB disertakan (bukan cuma utk tampilan) —
// dipakai sebagai basis reversal proporsional saat Retur diajukan dari
// hasil pencarian ini (lihat buildReturnAdjustments di
// features/penjualan/hooks.js). Row hasil query ini AMAN dipakai langsung
// sebagai `originalSale` utk useCreateRetur() karena fungsi itu murni baca
// field (location/stok_adjustments/buyer_name/buyer_hp), TIDAK pernah
// mem-lookup `sale.id` ke db.sales lokal — beda dari useUpdateSale/
// useDeleteSale yang mengasumsikan `sale.id` adalah primary key LOKAL
// Dexie (makanya modal riwayat ini SENGAJA tidak menyediakan aksi Edit/
// Hapus, hanya Lihat Struk + Retur).
export async function fetchSalesByPelanggan(pelangganId) {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, date, created_at, type, location, items, discount, total, buyer_name, buyer_hp, created_by_name, stok_adjustments",
    )
    .eq("pelanggan_id", pelangganId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Riwayat transaksi utk pembeli yang BELUM terdaftar sebagai pelanggan
// (pelanggan_id null di sale) — dicocokkan dari nama pembeli yang diketik
// manual saat checkout (lihat BuyerInput.jsx). SENGAJA cocok persis
// (case-insensitive via ilike TANPA wildcard `%`, bukan substring search) —
// keputusan Denny: no HP sering kosong utk pembeli lama, jadi nama adalah
// satu-satunya kunci yang tersedia, walau berisiko dua orang beda dengan
// nama sama ke-gabung jadi satu riwayat. Kalau di kemudian hari perlu lebih
// presisi, tambahkan pencocokan buyer_hp juga di sini.
export async function fetchSalesByBuyerName(buyerName) {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, date, created_at, type, location, items, discount, total, buyer_name, buyer_hp, created_by_name, stok_adjustments",
    )
    .ilike("buyer_name", buyerName)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Tambah pelanggan baru
export async function addPelanggan({ nama, no_hp, alamat }) {
  const now = new Date().toISOString();
  const row = {
    nama: nama.trim(),
    no_hp: no_hp?.trim() || null,
    alamat: alamat?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  let result;
  if (navigator.onLine) {
    const { data, error } = await supabase.from("pelanggan").insert(row).select().single();
    if (error) throw error;
    await db.pelanggan.put(data);
    result = data;
  } else {
    const id = crypto.randomUUID();
    await db.pelanggan.put({ id, ...row });
    result = { id, ...row };
  }

  await logActivity({
    action: "pelanggan-tambah",
    category: "pelanggan",
    kode: result.id,
    nama: result.nama,
    snapshot: result,
  });
  return result;
}

// Update pelanggan
export async function updatePelanggan(id, { nama, no_hp, alamat }) {
  const updated_at = new Date().toISOString();
  const before = await db.pelanggan.get(id);
  const changes = {
    nama: nama.trim(),
    no_hp: no_hp?.trim() || null,
    alamat: alamat?.trim() || null,
    updated_at,
  };

  if (navigator.onLine) {
    const { error } = await supabase.from("pelanggan").update(changes).eq("id", id);
    if (error) throw error;
  }
  await db.pelanggan.update(id, changes);

  await logActivity({
    action: "pelanggan-edit",
    category: "pelanggan",
    kode: id,
    nama: changes.nama,
    snapshot: { id, ...changes },
    before,
  });
}

// Hapus pelanggan
export async function deletePelanggan(id) {
  const before = await db.pelanggan.get(id);

  if (navigator.onLine) {
    const { error } = await supabase.from("pelanggan").delete().eq("id", id);
    if (error) throw error;
  }
  await db.pelanggan.delete(id);

  await logActivity({
    action: "pelanggan-hapus",
    category: "pelanggan",
    kode: id,
    nama: before?.nama ?? "",
    before,
  });
}
