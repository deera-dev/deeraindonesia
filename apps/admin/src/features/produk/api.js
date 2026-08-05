/**
 * features/produk/api.js
 * Panggilan Supabase MENTAH untuk fitur produk — pure async, tidak ada React.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { logHistory } from "../history/api";

// ── Agregasi stok per kode (grid produk) ─────────────────────────────────────
// Dipindah ke RPC Postgres `get_stock_summary` (Migration Phase 1, lihat
// supabase/migrations/20260711_migration_phase1_rpc_stock_summary.sql)
// supaya GROUP BY kode / GROUP BY kode+size / SUM gudang+cideng+tegalgubug
// (sebelumnya dilakukan di JS setelah menarik SELURUH tabel stok_warna
// tanpa filter) dilakukan sepenuhnya di database. RPC mengembalikan
// jsonb dengan bentuk yang SUDAH PERSIS sama dengan object map lama
// ({ [kode]: {gudang,cideng,tegalgubug,sizes:{[size]:{...}}} }), jadi
// tidak ada lagi reshape/aggregate di client — fungsi ini hanya
// meneruskan hasil RPC apa adanya.
export async function fetchStokMap() {
  const { data, error } = await supabase.rpc("get_stock_summary");
  if (error || !data) return {};
  return data;
}

// ── Total qty terjual all-time per kode (utk sort "Terlaris" di filter) ─────
// RPC `get_product_sold_qty` (lihat supabase/migrations/20260805_get_product_sold_qty_rpc.sql)
// — jsonb map {kode: total_qty}, TANPA batas top-N dan TANPA filter tanggal
// (beda dari leaderboard Analytics yang dibatasi rentang tanggal + top 10).
// Kode yang tidak pernah terjual (net qty <= 0) TIDAK muncul sebagai key.
export async function fetchSoldQtyMap() {
  const { data, error } = await supabase.rpc("get_product_sold_qty");
  if (error || !data) return {};
  return data;
}

// ── Stok per warna untuk satu produk ────────────────────────────────────────
export async function fetchStokWarnaByKode(kode) {
  const { data } = await supabase
    .from("stok_warna")
    .select("size, warna, gudang, cideng, tegalgubug")
    .eq("kode", kode);
  const map = {};
  (data ?? []).forEach((row) => {
    if (!map[row.size]) map[row.size] = {};
    map[row.size][row.warna] = {
      gudang: row.gudang,
      cideng: row.cideng,
      tegalgubug: row.tegalgubug,
    };
  });
  return map;
}

// ── Riwayat penjualan per lokasi untuk satu produk ───────────────────────────
// Dipindah ke RPC Postgres `get_sales_summary_by_product` (Migration
// Phase 1, lihat supabase/migrations/20260711_migration_phase1_rpc_sales_summary_by_product.sql)
// supaya agregasi qty per lokasi (yang sebelumnya menarik hingga 10.000
// baris tabel `sales` milik SEMUA produk ke client lalu difilter+dijumlah
// di JS) dilakukan sepenuhnya di database — hanya 4 angka hasil akhir
// yang dikirim ke client, bukan ribuan baris mentah.
//
// Business logic (filter type='sale', pencocokan kode, qty flat vs
// warna[].qty, penjumlahan per lokasi) direplikasi identik di dalam RPC
// — lihat migration untuk detail baris-per-baris. Kontrak fungsi ini
// TIDAK berubah: tetap tidak pernah melempar error ke pemanggil, tetap
// mengembalikan objek nol kalau terjadi kegagalan.
export async function fetchSalesByKode(kode) {
  const { data, error } = await supabase.rpc("get_sales_summary_by_product", {
    p_kode: kode,
  });

  if (error) {
    console.error("[fetchSalesByKode] error:", error);
    return { gudang: 0, cideng: 0, tegalgubug: 0, total: 0 };
  }

  return {
    gudang: data?.gudang ?? 0,
    cideng: data?.cideng ?? 0,
    tegalgubug: data?.tegalgubug ?? 0,
    total: data?.total ?? 0,
  };
}

// ── Simpan produk (insert/update) + sinkronisasi stok_warna + audit log ─────
export async function saveProduct({
  isEdit,
  originalKode,
  finalKode,
  fields,
  mainImage,
  seriWarnaImage,
  videoFile,
  detailImages,
  warna,
  warnaRenames = [],
  activeSet,
  hargaMap,
  stokWarnaMap,
  productBefore,
}) {
  // Validasi ukuran + kompresi (image) dilakukan di sini sebagai jaring
  // pengaman terakhir — ImageSection/ProductForm sudah memvalidasi &
  // mengompres saat file dipilih, tapi saveProduct() tetap memakai
  // uploadMedia() (bukan uploadImage/uploadVideo langsung) supaya jalur
  // upload manapun yang memanggil fungsi ini otomatis terlindungi dari
  // error 400 Cloudinary "file size too large".
  const mainUrl = mainImage
    ? mainImage.type === "url"
      ? mainImage.url
      : (await uploadMedia(mainImage.file, { kind: "image" })).url
    : null;
  const seriWarnaUrl = seriWarnaImage
    ? seriWarnaImage.type === "url"
      ? seriWarnaImage.url
      : (await uploadMedia(seriWarnaImage.file, { kind: "image" })).url
    : null;
  const videoUrl = videoFile
    ? videoFile.type === "url"
      ? videoFile.url
      : (await uploadMedia(videoFile.file, { kind: "video" })).url
    : null;
  const detailUrls = await Promise.all(
    detailImages.map((img) =>
      img.type === "url"
        ? img.url
        : uploadMedia(img.file, { kind: "image" }).then((r) => r.url),
    ),
  );

  const variants = SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map((p) => ({
    size: p.size,
    ld: p.ld,
    pb: p.pb,
    harga: parseInt(hargaMap[p.size] ?? "0") || 0,
  }));

  const payload = {
    kode: finalKode,
    nama: fields.nama.trim(),
    image: mainUrl,
    seri_warna: seriWarnaUrl,
    video: videoUrl,
    detail: detailUrls,
    bahan: fields.bahan.trim(),
    variants,
    hpp: parseInt(fields.hpp.replace(/\D/g, "")) || 0,
    warna,
  };

  if (isEdit) {
    const { error } = await supabase.from("products").update(payload).eq("kode", originalKode);
    if (error) throw error;
    await logHistory({
      action: "edit",
      category: "produk",
      kode: finalKode,
      nama: payload.nama,
      snapshot: payload,
      before: productBefore,
    });
  } else {
    const { error } = await supabase.from("products").insert(payload);
    if (error) throw error;
    await logHistory({
      action: "tambah",
      category: "produk",
      kode: finalKode,
      nama: payload.nama,
      snapshot: payload,
    });
  }

  // Proses rename warna (ditunda sampai tombol Simpan diklik, lihat
  // WarnaSection.jsx + ProductForm.jsx). Jalankan RPC `rename_produk_warna`
  // per pasangan {from,to} SEBELUM sinkronisasi stok_warna di bawah, supaya
  // baris lama (nama lama, beserta stok gudang/cideng/tegalgubug-nya) sudah
  // berpindah ke nama baru — bukan dianggap "warna baru" (stok 0) dan bukan
  // dianggap "warna orphan" yang dihapus. RPC ini juga sekaligus merapikan
  // nama warna lama di riwayat (sales.items, sales.stok_adjustments,
  // produksi_batch.sizes) dan di expected_stok — lihat migration
  // `add_rename_produk_warna_function`. Jalankan terhadap `originalKode`
  // (bukan `finalKode`) karena baris-baris historis tsb masih tersimpan di
  // bawah kode LAMA pada titik ini (update kode produk, kalau ada, sudah
  // dieksekusi di atas tapi tidak mengubah kode di tabel lain).
  if (isEdit && warnaRenames.length > 0) {
    for (const { from, to } of warnaRenames) {
      const { error: renameErr } = await supabase.rpc("rename_produk_warna", {
        p_kode: originalKode,
        p_old_warna: from,
        p_new_warna: to,
      });
      if (renameErr) throw renameErr;
    }
  }

  // Buat baris stok_warna untuk kombinasi baru (stok default 0)
  const warnaList = warna.length > 0 ? warna : ["_"];
  const existingKeys = new Set();
  for (const [size, warnaMap] of Object.entries(stokWarnaMap)) {
    for (const w of Object.keys(warnaMap)) existingKeys.add(`${size}__${w}`);
  }
  // `stokWarnaMap` adalah snapshot SEBELUM rename (masih pakai nama lama).
  // Augment manual: kombinasi size+namaBaru hasil rename di atas SUDAH ADA
  // di stok_warna (baris di-UPDATE, bukan dibuat baru) — tandai juga sebagai
  // "existing" supaya tidak dianggap kombinasi baru & tidak coba di-insert
  // ulang (yang akan gagal karena duplicate key kode+size+warna).
  for (const { from, to } of warnaRenames) {
    for (const key of [...existingKeys]) {
      const suffix = `__${from}`;
      if (key.endsWith(suffix)) {
        const size = key.slice(0, -suffix.length);
        existingKeys.add(`${size}__${to}`);
      }
    }
  }
  const newRows = SIZE_PRESETS.filter((p) => activeSet.has(p.size))
    .flatMap((p) => warnaList.map((w) => ({ size: p.size, warna: w })))
    .filter((c) => !existingKeys.has(`${c.size}__${c.warna}`))
    .map((c) => ({
      kode: finalKode,
      size: c.size,
      warna: c.warna,
      gudang: 0,
      cideng: 0,
      tegalgubug: 0,
      updated_at: new Date().toISOString(),
    }));
  if (newRows.length > 0) {
    const { error: stokErr } = await supabase.from("stok_warna").insert(newRows);
    if (stokErr) throw stokErr;
  }

  // Hapus orphan warna (warna dihapus dari produk)
  if (isEdit) {
    const currentSet = new Set(warnaList);
    const orphanedWarnas = new Set();
    for (const warnaMap of Object.values(stokWarnaMap)) {
      for (const w of Object.keys(warnaMap)) if (!currentSet.has(w)) orphanedWarnas.add(w);
    }
    for (const orphanW of orphanedWarnas) {
      await supabase.from("stok_warna").delete().eq("kode", finalKode).eq("warna", orphanW);
    }
  }

  return payload;
}

// ── Hapus produk + cascade tabel terkait ─────────────────────────────────────
export async function deleteProductCascade(kode) {
  await supabase.from("produksi_batch").delete().eq("kode_produk", kode);
  await supabase.from("expected_stok").delete().eq("kode", kode);
  await supabase.from("hpp_template").delete().eq("kode_produk", kode);
  await supabase.from("stok_warna").delete().eq("kode", kode);
  const { data: produk } = await supabase
    .from("products")
    .select("kode, nama")
    .eq("kode", kode)
    .single();
  await supabase.from("products").delete().eq("kode", kode);
  await logHistory({
    action: "hapus",
    category: "produk",
    kode,
    nama: produk?.nama ?? kode,
    snapshot: null,
  });
}
