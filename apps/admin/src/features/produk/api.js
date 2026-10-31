import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

export async function fetchStokMap() {
  const { data, error } = await supabase.rpc("get_stock_summary");
  if (error || !data) return {};
  return data;
}

export async function fetchSoldQtyMap() {
  const { data, error } = await supabase.rpc("get_product_sold_qty");
  if (error || !data) return {};
  return data;
}

export async function fetchProductBadges(days = 30) {
  const { data, error } = await supabase.rpc("refresh_product_badges", { p_days: days });
  if (error || !data) return {};
  return data;
}

export async function fetchProductPriceHistory(kode) {
  const { data, error } = await supabase.rpc("get_product_price_history", { p_kode: kode });
  if (error || !data) return [];
  return data;
}

export async function fetchProductAchievements(kode) {
  const { data, error } = await supabase.rpc("get_product_achievements", { p_kode: kode });
  if (error || !data) return [];
  return data;
}

export async function fetchProductBadgeReason(kode) {
  const { data, error } = await supabase.rpc("get_product_badge_reason", {
    p_kode: kode,
    p_days: 30,
  });
  if (error || !data || data.length === 0) return null;
  return data[0];
}

export async function fetchProductBadgeHistory(kode) {
  const { data, error } = await supabase.rpc("get_product_badge_history", { p_kode: kode });
  if (error || !data) return [];
  return data;
}

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

export async function fetchSalesDetailByKode(kode) {
  const { data, error } = await supabase.rpc("get_sales_detail_by_product", {
    p_kode: kode,
  });

  if (error || !data) {
    console.error("[fetchSalesDetailByKode] error:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    buyer_name: row.buyer_name,
    buyer_hp: row.buyer_hp,
    location: row.location,
    qty: row.qty,
  }));
}

export async function fetchProducedByKode(kode) {
  const { data, error } = await supabase
    .from("produksi_batch")
    .select("sizes")
    .eq("kode_produk", kode);

  if (error || !data) return {};

  const map = {};
  data.forEach((batch) => {
    (batch.sizes ?? []).forEach(({ size, warna }) => {
      if (!size) return;
      const qtyForSize = (warna ?? []).reduce((s, w) => s + (Number(w.qty) || 0), 0);
      map[size] = (map[size] ?? 0) + qtyForSize;
    });
  });
  return map;
}

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
      img.type === "url" ? img.url : uploadMedia(img.file, { kind: "image" }).then((r) => r.url),
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

  const warnaList = warna.length > 0 ? warna : ["_"];
  const existingKeys = new Set();
  for (const [size, warnaMap] of Object.entries(stokWarnaMap)) {
    for (const w of Object.keys(warnaMap)) existingKeys.add(`${size}__${w}`);
  }
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

  if (isEdit) {
    const currentSet = new Set(warnaList);
    const orphanedWarnas = new Set();
    for (const warnaMap of Object.values(stokWarnaMap)) {
      for (const w of Object.keys(warnaMap)) if (!currentSet.has(w)) orphanedWarnas.add(w);
    }
    for (const orphanW of orphanedWarnas) {
      let del = supabase.from("stok_warna").delete().eq("kode", finalKode).eq("warna", orphanW);
      if (orphanW === "_") del = del.eq("gudang", 0).eq("cideng", 0).eq("tegalgubug", 0);
      await del;
    }
  }

  return payload;
}

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
