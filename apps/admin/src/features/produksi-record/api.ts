import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { deleteProductCascade } from "../produk/api";
import { createJahitCardsForBatch, renameJahitCardsForBatch } from "../produksi-jahit/api";
import type {
  BatchEntry,
  BatchSize,
  HppTemplate,
  KaryawanPotong,
  ProduksiBatch,
  SharedBatchFields,
  UpdateBatchPayload,
} from "./schema";

export async function fetchBatches(): Promise<ProduksiBatch[]> {
  const { data } = await supabase
    .from("produksi_batch")
    .select("*")
    .order("kode_produk", { ascending: false });
  return data ?? [];
}

export async function fetchKaryawanPotong(): Promise<KaryawanPotong[]> {
  const { data, error } = await supabase
    .from("karyawan")
    .select("id, nama")
    .eq("tim", "potong")
    .eq("aktif", true)
    .order("nama");
  if (error) throw error;
  return data ?? [];
}

export async function fetchHppTemplate(
  kodeProduk: string | null | undefined,
): Promise<HppTemplate | null> {
  if (!kodeProduk) return null;
  const { data } = await supabase
    .from("hpp_template")
    .select("*")
    .eq("kode_produk", kodeProduk)
    .single();
  return data ?? null;
}

export async function resyncBahanDipakai(
  batch: ProduksiBatch,
): Promise<ProduksiBatch["bahan_dipakai"]> {
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

export async function deleteBatchAndProduct(batch: ProduksiBatch): Promise<void> {
  await deleteProductCascade(batch.kode_produk, "produksi");
}

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
  tukangPotongId,
  tukangPotongNama,
}: BatchEntry): Promise<void> {
  const bahanDipakai =
    template?.bahan_items?.map((b) => ({
      nama_bahan: b.nama_bahan,
      kode_bahan: b.kode_bahan ?? "",
      satuan: b.satuan,
      jumlah: Math.round((Number(b.qty_per_baju) || 0) * totalKain * 100) / 100,
    })) ?? [];

  const { data, error } = await supabase.rpc("create_produksi_batch", {
    p_kode: kode,
    p_nama: nama,
    p_bahan: bahan || null,
    p_variants: activeVariants.map((v) => ({ size: v.size, harga: 0, ld: v.ld, pb: v.pb })),
    p_warna: warnaList.length > 0 ? warnaList : [],
    p_hpp: template?.total_hpp ?? 0,
    p_batch_no: batchNo,
    p_tanggal: tanggal,
    p_total_kain: totalKain,
    p_sizes: sizes,
    p_bahan_dipakai: bahanDipakai,
    p_hpp_snapshot: template ?? null,
    p_hpp_per_item: template?.total_hpp ?? 0,
    p_catatan: catatan,
    p_upah_jahit: Number(upahJahit) || 0,
    p_tukang_potong_id: tukangPotongId || null,
    p_tukang_potong_nama: tukangPotongNama || null,
  });
  if (error) throw new Error(error.message);

  createJahitCardsForBatch({ batchId: data?.id, kode, nama, sizes }).catch((err: unknown) =>
    console.warn("createJahitCardsForBatch error:", err),
  );
}

export async function createBatches(
  entries: BatchEntry[],
  shared: SharedBatchFields,
): Promise<void> {
  for (const entry of entries) {
    await saveEntry({ ...entry, ...shared });
  }
}

interface FallbackVariant {
  size: string;
  harga: number;
  ld: number;
  pb: number;
}

function deriveProductFieldsFromSizes(sizes: BatchSize[] | null | undefined): {
  variants: FallbackVariant[];
  warna: string[];
} {
  const variants: FallbackVariant[] = (sizes ?? []).map((s) => {
    const preset = SIZE_PRESETS.find((p: { size: string }) => p.size === s.size);
    return { size: s.size, harga: 0, ld: preset?.ld ?? 0, pb: preset?.pb ?? 0 };
  });
  const warnaSet = new Set<string>();
  for (const s of sizes ?? []) {
    for (const w of s.warna ?? []) {
      if (w.warna && w.warna !== "_") warnaSet.add(w.warna);
    }
  }
  return { variants, warna: [...warnaSet] };
}

export async function updateBatch(
  payload: UpdateBatchPayload,
  _extraEntries?: unknown,
  _shared?: unknown,
): Promise<void> {
  const {
    initial,
    kode,
    nama,
    tanggal,
    totalKain,
    sizes,
    bahanDipakai,
    batchNo,
    catatan,
    upahJahit,
    tukangPotongId,
    tukangPotongNama,
  } = payload;
  const kodeChanged = kode !== initial.kode_produk;
  const { variants: fallbackVariants, warna: fallbackWarna } = deriveProductFieldsFromSizes(sizes);

  const { error } = await supabase.rpc("update_produksi_batch", {
    p_batch_id: initial.id,
    p_initial_kode: initial.kode_produk,
    p_kode: kode,
    p_nama: nama,
    p_tanggal: tanggal,
    p_total_kain: totalKain,
    p_sizes: sizes,
    p_bahan_dipakai: bahanDipakai,
    p_batch_no: batchNo,
    p_catatan: catatan,
    p_upah_jahit: Number(upahJahit) || 0,
    p_tukang_potong_id: tukangPotongId || null,
    p_tukang_potong_nama: tukangPotongNama || null,
    p_fallback_variants: fallbackVariants,
    p_fallback_warna: fallbackWarna,
  });
  if (error) throw new Error(error.message);

  createJahitCardsForBatch({ batchId: initial.id, kode, nama, sizes }).catch((err: unknown) =>
    console.warn("createJahitCardsForBatch error:", err),
  );

  if (kodeChanged) {
    renameJahitCardsForBatch({ batchId: initial.id, kode, nama }).catch((err: unknown) =>
      console.warn("renameJahitCardsForBatch error:", err),
    );
  }
}
