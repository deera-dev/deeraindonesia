/**
 * features/produksi-laporan/api.js
 * Panggilan Supabase MENTAH untuk laporan produksi bulanan — pure async,
 * tidak ada React di sini.
 */
import { supabase } from "@deera/shared/lib/supabase";

// Laporan produksi untuk rentang tanggal (batch + ringkasan + pemakaian
// bahan) — dihitung SEPENUHNYA di RPC Postgres `get_laporan_produksi`
// (Migration Phase 1, lihat
// supabase/migrations/20260712_migration_phase1_rpc_laporan_produksi.sql).
// RPC mengembalikan OBJECT siap tampil { batches, ringkasan, bahanUsage } —
// enrichment hpp_per_item/bahan_dipakai/harga_jual per batch, SUM/COUNT/AVG
// ringkasan, dan GROUP BY pemakaian bahan semuanya sudah dihitung di
// database. Fungsi ini murni meneruskan hasil RPC, tidak ada reduce/map/
// business logic di sini.
export async function fetchProduksiBatches({ fromDate, toDate }) {
  const { data } = await supabase.rpc("get_laporan_produksi", {
    p_from_date: fromDate,
    p_to_date: toDate,
  });
  return data ?? { batches: [], ringkasan: {}, bahanUsage: [] };
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

// Statistik batch produksi all-time (total batch, total baju, total
// modal) — dihitung SEPENUHNYA di RPC Postgres `get_produksi_batches_total`
// (Migration Phase 1, revisi arsitektur: lihat
// supabase/migrations/20260711_migration_phase1_rpc_produksi_batches_total.sql).
// RPC mengembalikan OBJECT hasil agregat langsung ({totalBatch, totalBaju,
// totalModal}), BUKAN array baris mentah — SUM/COUNT/fallback HPP
// (effective_hpp) semuanya sudah dihitung di database. Fungsi ini murni
// meneruskan hasil RPC, tidak ada reduce/map/business logic di sini.
export async function fetchProduksiBatchesTotal() {
  const { data } = await supabase.rpc("get_produksi_batches_total");
  return data ?? { totalBatch: 0, totalBaju: 0, totalModal: 0 };
}
