import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";
import { supabase } from "@deera/shared/lib/supabase";
import {
  type ProducedByKodeMap,
  type ProductAchievementRow,
  type ProductBadgeHistoryRow,
  type ProductBadgeMap,
  type ProductBadgeReasonRow,
  type ProductPriceHistoryRow,
  type SalesByKodeMap,
  type SalesDetailRow,
  type SaveProductParams,
  type SaveProductPayload,
  type SoldQtyMap,
  type StokMap,
  type StokWarnaByKodeMap,
  saveProductInputSchema,
} from "./schema";

export async function fetchStokMap(): Promise<StokMap> {
  const { data, error } = await supabase.rpc("get_stock_summary");
  if (error || !data) return {};
  return data;
}

export async function fetchSoldQtyMap(): Promise<SoldQtyMap> {
  const { data, error } = await supabase.rpc("get_product_sold_qty");
  if (error || !data) return {};
  return data;
}

export async function fetchProductBadges(days = 30): Promise<ProductBadgeMap> {
  const { data, error } = await supabase.rpc("refresh_product_badges", { p_days: days });
  if (error || !data) return {};
  return data;
}

export async function fetchProductPriceHistory(kode: string): Promise<ProductPriceHistoryRow[]> {
  const { data, error } = await supabase.rpc("get_product_price_history", { p_kode: kode });
  if (error || !data) return [];
  return data;
}

export async function fetchProductAchievements(kode: string): Promise<ProductAchievementRow[]> {
  const { data, error } = await supabase.rpc("get_product_achievements", { p_kode: kode });
  if (error || !data) return [];
  return data;
}

export async function fetchProductBadgeReason(kode: string): Promise<ProductBadgeReasonRow | null> {
  const { data, error } = await supabase.rpc("get_product_badge_reason", {
    p_kode: kode,
    p_days: 30,
  });
  if (error || !data || data.length === 0) return null;
  return data[0];
}

export async function fetchProductBadgeHistory(kode: string): Promise<ProductBadgeHistoryRow[]> {
  const { data, error } = await supabase.rpc("get_product_badge_history", { p_kode: kode });
  if (error || !data) return [];
  return data;
}

export async function fetchStokWarnaByKode(kode: string): Promise<StokWarnaByKodeMap> {
  const { data } = await supabase
    .from("stok_warna")
    .select("size, warna, gudang, cideng, tegalgubug, ngorder")
    .eq("kode", kode);
  const map: StokWarnaByKodeMap = {};
  (data ?? []).forEach((row) => {
    if (!map[row.size]) map[row.size] = {};
    map[row.size]![row.warna] = {
      gudang: row.gudang,
      cideng: row.cideng,
      tegalgubug: row.tegalgubug,
      ngorder: row.ngorder,
    };
  });
  return map;
}

// RPC mengembalikan per UKURAN -- { [size]: { gudang, cideng, tegalgubug, total } }
// -- 1 kode bisa punya >1 ukuran (mis. Midi + Gamis) dgn stok/produksi yang
// independen, jadi sengaja TIDAK dijumlah jadi 1 angka di sini.
export async function fetchSalesByKode(kode: string): Promise<SalesByKodeMap> {
  const { data, error } = await supabase.rpc("get_sales_summary_by_product", {
    p_kode: kode,
  });

  if (error) {
    console.error("[fetchSalesByKode] error:", error);
    return {};
  }

  return data ?? {};
}

export async function fetchDikirimByKode(kode: string): Promise<SalesByKodeMap> {
  const { data, error } = await supabase.rpc("get_keep_terkirim_summary_by_product", {
    p_kode: kode,
  });

  if (error) {
    console.error("[fetchDikirimByKode] error:", error);
    return {};
  }

  return data ?? {};
}

export async function fetchSalesDetailByKode(kode: string): Promise<SalesDetailRow[]> {
  const { data, error } = await supabase.rpc("get_sales_detail_by_product", {
    p_kode: kode,
  });

  if (error || !data) {
    console.error("[fetchSalesDetailByKode] error:", error);
    return [];
  }

  return data.map(
    (row: {
      id: string;
      created_at: string;
      buyer_name: string | null;
      buyer_hp: string | null;
      location: string;
      qty: number;
    }) => ({
      id: row.id,
      created_at: row.created_at,
      buyer_name: row.buyer_name,
      buyer_hp: row.buyer_hp,
      location: row.location,
      qty: row.qty,
    }),
  );
}

export async function fetchProducedByKode(kode: string): Promise<ProducedByKodeMap> {
  const { data, error } = await supabase
    .from("produksi_batch")
    .select("sizes")
    .eq("kode_produk", kode);

  if (error || !data) return {};

  const map: ProducedByKodeMap = {};
  data.forEach((batch: { sizes?: Array<{ size: string; warna?: Array<{ qty: number }> }> }) => {
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
}: SaveProductParams): Promise<SaveProductPayload> {
  const mainUrl = mainImage
    ? mainImage.type === "url"
      ? (mainImage.url ?? null)
      : (await uploadMedia(mainImage.file, { kind: "image" })).url
    : null;
  const seriWarnaUrl = seriWarnaImage
    ? seriWarnaImage.type === "url"
      ? (seriWarnaImage.url ?? null)
      : (await uploadMedia(seriWarnaImage.file, { kind: "image" })).url
    : null;
  const videoUrl = videoFile
    ? videoFile.type === "url"
      ? (videoFile.url ?? null)
      : (await uploadMedia(videoFile.file, { kind: "video" })).url
    : null;
  const detailUrls: string[] = await Promise.all(
    detailImages.map((img) =>
      img.type === "url" ? img.url! : uploadMedia(img.file, { kind: "image" }).then((r) => r.url),
    ),
  );

  const variants = SIZE_PRESETS.filter((p: { size: string }) => activeSet.has(p.size)).map(
    (p: { size: string; ld: number; pb: number }) => ({
      size: p.size,
      ld: p.ld,
      pb: p.pb,
      harga: parseInt(hargaMap[p.size] ?? "0") || 0,
    }),
  );

  const payload: SaveProductPayload = {
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

  // Tulis DB-nya (products + stok_warna baru/orphan + product_history +
  // rename warna) sekarang 1 panggilan atomik lewat RPC save_product
  // (supabase/migrations/20261120_save_product_delete_product_cascade.sql)
  // — dulu ini 4-6 panggilan supabase.from() berurutan tanpa transaction.
  // stokWarnaMap TIDAK dikirim lagi — RPC baca state stok_warna LANGSUNG
  // dari tabel di dalam transaction yang sama, bukan percaya snapshot
  // client yang bisa basi.
  const input = saveProductInputSchema.parse({
    isEdit,
    originalKode: originalKode || null,
    finalKode,
    nama: payload.nama,
    image: payload.image,
    seriWarna: payload.seri_warna,
    video: payload.video,
    detail: payload.detail,
    bahan: payload.bahan,
    variants: payload.variants,
    hpp: payload.hpp,
    warna: payload.warna,
    warnaRenames,
  });

  const { data, error } = await supabase.functions.invoke("produk-crud", {
    body: { action: "save", input },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return payload;
}

// sumber opsional — marker "Dari: produksi" di history waktu dipanggil
// dari produksi-record/api.js (hapus batch sekaligus produknya), lihat
// supabase/migrations/20261120_delete_product_cascade_sumber.sql.
export async function deleteProductCascade(kode: string, sumber?: string | null): Promise<void> {
  const { data, error } = await supabase.functions.invoke("produk-crud", {
    body: { action: "delete", input: { kode, sumber: sumber ?? null } },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
