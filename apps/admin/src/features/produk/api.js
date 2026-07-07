/**
 * features/produk/api.js
 * Panggilan Supabase MENTAH untuk fitur produk — pure async, tidak ada React.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { uploadImage, uploadVideo } from "@deera/shared/lib/cloudinary";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { logHistory } from "../history/api";

// ── Agregasi stok per kode (grid produk) ─────────────────────────────────────
export async function fetchStokMap() {
  const { data, error } = await supabase
    .from("stok_warna")
    .select("kode, size, gudang, cideng, tegalgubug");
  if (error || !data) return {};
  const map = {};
  for (const row of data) {
    if (!map[row.kode]) map[row.kode] = { gudang: 0, cideng: 0, tegalgubug: 0, sizes: {} };
    map[row.kode].gudang += row.gudang ?? 0;
    map[row.kode].cideng += row.cideng ?? 0;
    map[row.kode].tegalgubug += row.tegalgubug ?? 0;
    if (!map[row.kode].sizes[row.size]) {
      map[row.kode].sizes[row.size] = { gudang: 0, cideng: 0, tegalgubug: 0 };
    }
    map[row.kode].sizes[row.size].gudang += row.gudang ?? 0;
    map[row.kode].sizes[row.size].cideng += row.cideng ?? 0;
    map[row.kode].sizes[row.size].tegalgubug += row.tegalgubug ?? 0;
  }
  return map;
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
export async function fetchSalesByKode(kode) {
  // limit eksplisit — default Supabase hanya 1000 baris
  const { data, error } = await supabase
    .from("sales")
    .select("location, items")
    .eq("type", "sale")
    .limit(10000);

  if (error) {
    console.error("[fetchSalesByKode] error:", error);
    return { gudang: 0, cideng: 0, tegalgubug: 0, total: 0 };
  }

  const counts = { gudang: 0, cideng: 0, tegalgubug: 0, total: 0 };
  for (const sale of data ?? []) {
    for (const item of sale.items ?? []) {
      if (item.kode === kode) {
        // item.qty = null untuk produk berwarna (qty ada di item.warna[].qty)
        const qty = Array.isArray(item.warna)
          ? item.warna.reduce((s, w) => s + (w.qty ?? 0), 0)
          : (Number(item.qty) || 0);
        if (qty > 0 && sale.location in counts) {
          counts[sale.location] += qty;
          counts.total += qty;
        }
      }
    }
  }
  return counts;
}

// ── Simpan produk (insert/update) + sinkronisasi stok_warna + audit log ─────
export async function saveProduct({
  isEdit,
  originalKode,
  finalKode,
  fields,
  mainImage,
  videoFile,
  detailImages,
  warna,
  activeSet,
  hargaMap,
  stokWarnaMap,
  productBefore,
}) {
  const mainUrl = mainImage
    ? mainImage.type === "url"
      ? mainImage.url
      : (await uploadImage(mainImage.file)).url
    : null;
  const videoUrl = videoFile
    ? videoFile.type === "url"
      ? videoFile.url
      : (await uploadVideo(videoFile.file)).url
    : null;
  const detailUrls = await Promise.all(
    detailImages.map((img) =>
      img.type === "url" ? img.url : uploadImage(img.file).then((r) => r.url),
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

  // Buat baris stok_warna untuk kombinasi baru (stok default 0)
  const warnaList = warna.length > 0 ? warna : ["_"];
  const existingKeys = new Set();
  for (const [size, warnaMap] of Object.entries(stokWarnaMap)) {
    for (const w of Object.keys(warnaMap)) existingKeys.add(`${size}__${w}`);
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
