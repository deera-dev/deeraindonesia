/**
 * api.js — Panggilan Supabase MENTAH untuk fitur catatan produksi batch.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

export async function fetchBatches() {
  const { data } = await supabase
    .from("produksi_batch")
    .select("*")
    .order("kode_produk", { ascending: false });
  return data ?? [];
}

export async function fetchHppTemplate(kodeProduk) {
  if (!kodeProduk) return null;
  const { data } = await supabase
    .from("hpp_template")
    .select("*")
    .eq("kode_produk", kodeProduk)
    .single();
  return data ?? null;
}

// ── Sinkronkan ulang bahan_dipakai satu batch ────────────────────────────────
// Kenapa ini perlu ada: bahan_dipakai (dipakai view v_stok_bahan untuk kolom
// "Keluar" di Daftar Stok Bahan) hanya diisi dari Template HPP produk PADA
// SAAT batch dibuat/diedit (lihat saveEntry/updateBatch di bawah). Kalau
// Template HPP belum ada saat itu, bahan_dipakai tersimpan [] dan tetap []
// selamanya walau Template dibuat belakangan — user harus membuka lagi form
// edit batch supaya nilainya dihitung ulang. Fungsi ini memberi jalan pintas:
// hitung ulang bahan_dipakai (+ hpp_snapshot/hpp_per_item bila masih kosong)
// dari Template HPP TERKINI × total_kain batch, tanpa perlu membuka form.
//
// Aman dipanggil berkali-kali (idempotent) — nilai di-OVERWRITE, bukan
// ditambahkan, jadi tidak ada risiko double counting di v_stok_bahan.
export async function resyncBahanDipakai(batch) {
  const template = await fetchHppTemplate(batch.kode_produk);
  if (!template?.bahan_items?.length) {
    throw new Error(
      `Produk ${batch.kode_produk} belum punya Template HPP dengan bahan. Buat Template HPP dulu di menu Produksi HPP, lalu coba sinkronkan lagi.`,
    );
  }

  const bahanDipakai = template.bahan_items.map((b) => ({
    nama_bahan: b.nama_bahan,
    kode_bahan: b.kode_bahan ?? "",
    satuan: b.satuan,
    jumlah: Math.round((Number(b.qty_per_baju) || 0) * batch.total_kain * 100) / 100,
  }));

  const { error } = await supabase
    .from("produksi_batch")
    .update({
      bahan_dipakai: bahanDipakai,
      hpp_snapshot: batch.hpp_snapshot ?? template,
      hpp_per_item: batch.hpp_per_item > 0 ? batch.hpp_per_item : (template.total_hpp ?? 0),
    })
    .eq("id", batch.id);
  if (error) throw new Error(error.message);

  logHistory({
    action: "batch-produksi",
    category: "produksi",
    kode: batch.kode_produk,
    nama: batch.nama_produk,
    snapshot: { batch_no: batch.batch_no, bahan_dipakai: bahanDipakai, sinkronisasi: true },
  }).catch(() => {});

  return bahanDipakai;
}

export async function deleteBatchAndProduct(batch) {
  const kode = batch.kode_produk;
  await supabase.from("produksi_batch").delete().eq("kode_produk", kode);
  await supabase.from("expected_stok").delete().eq("kode", kode);
  await supabase.from("hpp_template").delete().eq("kode_produk", kode);
  await supabase.from("stok_warna").delete().eq("kode", kode);
  await supabase.from("products").delete().eq("kode", kode);
  logHistory({
    action: "hapus",
    category: "produk",
    kode,
    nama: batch.nama_produk ?? kode,
    snapshot: { kode, sumber: "produksi" },
  }).catch(() => {});
}

// Simpan satu entry produk + batch baru (dipakai mode "tambah" dan
// "tambah produk ke batch ini" saat edit).
async function saveEntry({
  kode,
  nama,
  bahan,
  activeVariants,
  warnaList,
  sizes,
  totalKain,
  template,
  batchNo,
  tanggal,
  catatan,
}) {
  const bahanDipakai =
    template?.bahan_items?.map((b) => ({
      nama_bahan: b.nama_bahan,
      kode_bahan: b.kode_bahan ?? "",
      satuan: b.satuan,
      jumlah: Math.round((Number(b.qty_per_baju) || 0) * totalKain * 100) / 100,
    })) ?? [];

  const { error: prodErr } = await supabase.from("products").upsert(
    {
      kode,
      nama,
      bahan: bahan || null,
      hpp: template?.total_hpp ?? 0,
      variants: activeVariants.map((v) => ({ size: v.size, harga: 0, ld: v.ld, pb: v.pb })),
      warna: warnaList.length > 0 ? warnaList : [],
    },
    { onConflict: "kode" },
  );
  if (prodErr) throw new Error(prodErr.message);

  const { error: batchErr } = await supabase.from("produksi_batch").insert({
    batch_no: batchNo,
    kode_produk: kode,
    nama_produk: nama,
    tanggal_produksi: tanggal,
    total_kain: totalKain,
    sizes,
    bahan_dipakai: bahanDipakai,
    hpp_snapshot: template ?? null,
    hpp_per_item: template?.total_hpp ?? 0,
    catatan,
  });
  if (batchErr) throw new Error(batchErr.message);

  const expectedRows = [];
  for (const sz of sizes) {
    for (const w of sz.warna ?? []) {
      expectedRows.push({ kode, size: sz.size, warna: w.warna, expected_qty: w.qty });
    }
  }
  if (expectedRows.length > 0) {
    const { error: expErr } = await supabase
      .from("expected_stok")
      .upsert(expectedRows, { onConflict: "kode,size,warna" });
    if (expErr) throw new Error(expErr.message);
  }

  logHistory({
    action: "batch-produksi",
    category: "produksi",
    kode,
    nama,
    snapshot: { batch_no: batchNo, tanggal, total_kain: totalKain, sizes, catatan },
  }).catch(() => {});
}

// Mode tambah: simpan satu atau lebih entry produk+batch sekaligus.
export async function createBatches(entries, shared) {
  for (const entry of entries) {
    await saveEntry({ ...entry, ...shared });
  }
}

// Mode edit: update batch utama (+ expected_stok), lalu simpan entry produk
// tambahan (jika ada) ke batch yang sama.
export async function updateBatch(payload, extraEntries, shared) {
  const { initial, kode, nama, tanggal, totalKain, sizes, bahanDipakai, batchNo, catatan } = payload;
  const kodeChanged = kode !== initial.kode_produk;

  const { error: batchErr } = await supabase
    .from("produksi_batch")
    .update({
      batch_no: batchNo,
      kode_produk: kode,
      nama_produk: nama,
      tanggal_produksi: tanggal,
      total_kain: totalKain,
      sizes,
      bahan_dipakai: bahanDipakai,
      catatan,
    })
    .eq("id", initial.id);
  if (batchErr) throw new Error(batchErr.message);

  if (kodeChanged) {
    await supabase.from("expected_stok").delete().eq("kode", initial.kode_produk);
  }

  const expectedRows = [];
  for (const sz of sizes) {
    for (const w of sz.warna ?? []) {
      expectedRows.push({ kode, size: sz.size, warna: w.warna, expected_qty: w.qty });
    }
  }
  if (expectedRows.length > 0) {
    await supabase.from("expected_stok").upsert(expectedRows, { onConflict: "kode,size,warna" });
  }

  logHistory({
    action: "batch-produksi",
    category: "produksi",
    kode,
    nama,
    snapshot: { batch_no: batchNo, tanggal, total_kain: totalKain, sizes, catatan, edit: true },
    before: {
      batch_no: initial.batch_no,
      kode_produk: initial.kode_produk,
      tanggal: initial.tanggal_produksi,
    },
  }).catch(() => {});
}
