/**
 * api.js — Panggilan Supabase MENTAH untuk fitur catatan produksi batch.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { logHistory } from "../history/api";
import { createJahitCardsForBatch, renameJahitCardsForBatch } from "../produksi-jahit/api";

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
  upahJahit,
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

  const { data: insertedBatch, error: batchErr } = await supabase
    .from("produksi_batch")
    .insert({
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
      upah_jahit: Number(upahJahit) || 0,
    })
    .select("id")
    .single();
  if (batchErr) throw new Error(batchErr.message);

  // Kartu Kanban Jahit (permintaan Denny 2026-09): tiap kombinasi size×warna
  // di batch ini otomatis jadi satu kartu di /produksi/jahit. Best-effort —
  // gagal bikin kartu TIDAK BOLEH membatalkan penyimpanan batch/produk yang
  // sudah sukses (sama semangatnya dengan logHistory di bawah).
  createJahitCardsForBatch({ batchId: insertedBatch?.id, kode, nama, sizes }).catch((err) =>
    console.warn("createJahitCardsForBatch error:", err),
  );

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

// Turunkan variants/warna produk dari `sizes` batch ([{size, warna:[{warna,qty}]}])
// — dipakai fallback bikin/ganti-nama baris `products` saat edit batch (lihat
// ensureProductForKode di bawah), supaya tidak perlu passing ulang
// activeVariants/warnaList dari BatchForm.jsx (sudah terkandung di `sizes`).
function deriveProductFieldsFromSizes(sizes) {
  const variants = (sizes ?? []).map((s) => {
    const preset = SIZE_PRESETS.find((p) => p.size === s.size);
    return { size: s.size, harga: 0, ld: preset?.ld ?? 0, pb: preset?.pb ?? 0 };
  });
  const warnaSet = new Set();
  for (const s of sizes ?? []) {
    for (const w of s.warna ?? []) {
      if (w.warna && w.warna !== "_") warnaSet.add(w.warna);
    }
  }
  return { variants, warna: [...warnaSet] };
}

// ── Pastikan baris `products` utk kode target ada SEBELUM produksi_batch
// di-update (permintaan Denny 2026-09 — bugfix) ──────────────────────────────
// Form Edit Batch mengizinkan admin ganti Kode Produk (lihat BatchForm.jsx
// bagian "Identitas Produk"). Sebelumnya updateBatch() langsung
// `.update({kode_produk: kode})` ke produksi_batch tanpa menyentuh tabel
// `products` sama sekali — kalau kode diganti ke kode yang belum py baris
// products, update produksi_batch GAGAL dengan FK error
// "produksi_batch_kode_produk_fkey ... Key is not present in table products"
// (beda dgn saveEntry/createBatches yang SELALU upsert products dulu).
//
// Perilaku:
// - Kode TIDAK berubah: pastikan baris products ada (self-heal kalau baris
//   lama entah kenapa hilang) — kalau tidak ada, buat baru dari data batch.
// - Kode BERUBAH: rename baris products lama ke kode baru (bukan bikin baris
//   baru terpisah — supaya nama/foto/HPP/dll produk lama ikut terbawa, bukan
//   hilang). Kalau kode baru sudah dipakai produk lain, tolak dgn pesan
//   jelas dulu sebelum sempat mengubah apa pun.
async function ensureProductForKode({ kode, initial, nama, sizes, kodeChanged }) {
  if (kodeChanged) {
    const { data: clash } = await supabase
      .from("products")
      .select("kode")
      .eq("kode", kode)
      .maybeSingle();
    if (clash) {
      throw new Error(`Kode produk "${kode}" sudah dipakai produk lain — pilih kode lain.`);
    }

    const { data: renamed, error: renameErr } = await supabase
      .from("products")
      .update({ kode })
      .eq("kode", initial.kode_produk)
      .select("kode");
    if (renameErr) throw new Error(renameErr.message);

    if (!renamed || renamed.length === 0) {
      // Baris products lama sudah tidak ada (data anomali) — buat baru dari
      // data batch yang sedang diedit supaya update produksi_batch tetap bisa jalan.
      const { variants, warna } = deriveProductFieldsFromSizes(sizes);
      const { error: insErr } = await supabase
        .from("products")
        .insert({ kode, nama, variants, warna });
      if (insErr) throw new Error(insErr.message);
    }
  } else {
    const { data: existing } = await supabase
      .from("products")
      .select("kode")
      .eq("kode", kode)
      .maybeSingle();
    if (!existing) {
      const { variants, warna } = deriveProductFieldsFromSizes(sizes);
      const { error: insErr } = await supabase
        .from("products")
        .upsert({ kode, nama, variants, warna }, { onConflict: "kode" });
      if (insErr) throw new Error(insErr.message);
    }
  }
}

// Mode edit: update batch utama (+ expected_stok), lalu simpan entry produk
// tambahan (jika ada) ke batch yang sama.
export async function updateBatch(payload, extraEntries, shared) {
  const { initial, kode, nama, tanggal, totalKain, sizes, bahanDipakai, batchNo, catatan, upahJahit } = payload;
  const kodeChanged = kode !== initial.kode_produk;

  await ensureProductForKode({ kode, initial, nama, sizes, kodeChanged });

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
      upah_jahit: Number(upahJahit) || 0,
    })
    .eq("id", initial.id);
  if (batchErr) throw new Error(batchErr.message);

  // Kartu Kanban Jahit: kalau batch ditambah warna/ukuran baru saat diedit,
  // kombinasi barunya otomatis dapat kartu (lihat createJahitCardsForBatch
  // di ../produksi-jahit/api.js — idempotent, TIDAK menimpa kartu yang
  // sudah ada, jadi status/assignment kartu lama aman).
  createJahitCardsForBatch({ batchId: initial.id, kode, nama, sizes }).catch((err) =>
    console.warn("createJahitCardsForBatch error:", err),
  );

  if (kodeChanged) {
    // Kode/nama produk berubah -> kartu Jahit yang SUDAH ADA (termasuk arsip
    // "done") ikut di-cascade ke kode/nama baru, supaya papan Jahit tidak
    // terlihat "belum berubah" dan pencocokan kode di rekonsiliasi stok
    // Finishing (Finance) tetap akurat (permintaan Denny 2026-09).
    renameJahitCardsForBatch({ batchId: initial.id, kode, nama }).catch((err) =>
      console.warn("renameJahitCardsForBatch error:", err),
    );
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
