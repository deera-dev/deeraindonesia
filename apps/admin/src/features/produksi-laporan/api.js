/**
 * features/produksi-laporan/api.js
 * Panggilan Supabase MENTAH untuk laporan produksi bulanan — pure async,
 * tidak ada React di sini.
 */
import { supabase } from "@deera/shared/lib/supabase";

// Ambil batch produksi dalam rentang tanggal, dengan enrichment hpp_per_item &
// bahan_dipakai dari hpp_template untuk batch lama yang belum punya snapshot.
export async function fetchProduksiBatches({ fromDate, toDate }) {
  const { data: batchData } = await supabase
    .from("produksi_batch")
    .select("*")
    .gte("tanggal_produksi", fromDate)
    .lte("tanggal_produksi", toDate)
    .order("tanggal_produksi");

  const rawBatches = batchData ?? [];
  const needTpl = rawBatches.filter(
    (b) => !b.hpp_per_item || (b.bahan_dipakai ?? []).length === 0,
  );
  const kodes = [...new Set(needTpl.map((b) => b.kode_produk).filter(Boolean))];

  let templateMap = {};
  if (kodes.length > 0) {
    const { data: tplData } = await supabase
      .from("hpp_template")
      .select("kode_produk,total_hpp,bahan_items")
      .in("kode_produk", kodes);
    for (const t of tplData ?? []) templateMap[t.kode_produk] = t;
  }

  return rawBatches.map((b) => {
    const tpl = templateMap[b.kode_produk];
    const hpp = b.hpp_per_item || tpl?.total_hpp || 0;
    const bahanDipakai =
      (b.bahan_dipakai ?? []).length > 0
        ? b.bahan_dipakai
        : tpl?.bahan_items?.map((bi) => ({
            nama_bahan: bi.nama_bahan,
            kode_bahan: bi.kode_bahan ?? "",
            satuan: bi.satuan,
            jumlah: Math.round((Number(bi.qty_per_baju) || 0) * (b.total_kain || 0) * 100) / 100,
          })) ?? [];
    return { ...b, hpp_per_item: hpp, bahan_dipakai: bahanDipakai };
  });
}

// Ambil tagihan jatuh tempo (gabungan pembelian + pinjam bahan) dalam rentang
// tanggal, diurut berdasarkan jatuh tempo terdekat.
export async function fetchTagihanJatuhTempo({ fromDate, toDate }) {
  const [{ data: beli }, { data: pinjam }] = await Promise.all([
    supabase
      .from("bahan_pembelian")
      .select("*")
      .eq("status_bayar", "belum")
      .gte("jatuh_tempo", fromDate)
      .lte("jatuh_tempo", toDate)
      .order("jatuh_tempo"),
    supabase
      .from("bahan_pinjam")
      .select("*")
      .eq("status_bayar", "belum")
      .gte("jatuh_tempo", fromDate)
      .lte("jatuh_tempo", toDate)
      .order("jatuh_tempo"),
  ]);

  return [
    ...(beli ?? []).map((r) => ({ ...r, _type: "beli" })),
    ...(pinjam ?? []).map((r) => ({ ...r, _type: "pinjam" })),
  ].sort((a, b) => new Date(a.jatuh_tempo) - new Date(b.jatuh_tempo));
}
