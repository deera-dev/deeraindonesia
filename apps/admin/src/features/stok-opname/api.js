/**
 * features/stok-opname/api.js
 * Panggilan Supabase MENTAH untuk Stok Opname — pure async, tidak ada React
 * di sini. logHistory diimport dari ../history/api (layer api, bukan hooks —
 * konsisten dengan precedent packages/shared/features/transfers/api.js).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { isSyntheticStokId, parseSyntheticStokId } from "./utils";

export async function fetchAllStokWarna() {
  const { data } = await supabase.from("stok_warna").select("*");
  return data ?? [];
}

/**
 * fetchJahitDikerjakan — agregat ALL-TIME "sudah dikerjakan tukang jahit"
 * per kode+ukuran (SEMUA WARNA DIGABUNG), dibaca dari view
 * v_jahit_dikerjakan (unnest gaji_jahit.kartu_items). Digabung per-ukuran
 * saja (bukan dipisah per-warna) karena staf Tim Jahit sering tidak mengisi
 * warna spesifik saat input kartu — memisah per-warna akan membuat data itu
 * tidak pernah cocok ke baris manapun (konfirmasi Denny 2026-08). Dipakai
 * HANYA sebagai info pembanding di layar Stok Opname (bukan input) — supaya
 * staf bisa lihat "sudah dikerjakan berapa" saat mengisi stok aktual secara
 * manual. Tidak mengubah alur input stok yang tetap manual sepenuhnya.
 */
export async function fetchJahitDikerjakan() {
  const { data, error } = await supabase.from("v_jahit_dikerjakan").select("*");
  if (error) throw error;
  return data ?? [];
}

/**
 * saveStokOpname — upsert baris stok_warna yang berubah + catat riwayat per kode.
 *
 * @param {object} opts
 * @param {object} opts.changed   — { [rowId]: {gudang?, cideng?, tegalgubug?} }
 * @param {array}  opts.stokRows  — snapshot stok_warna saat ini (GABUNGAN baris
 *                                  nyata + placeholder dari fillMissingStokRows()
 *                                  di StokOpnamePage.jsx, untuk before/merge —
 *                                  BUKAN cuma hasil fetchAllStokWarna() mentah,
 *                                  supaya baris placeholder yg baru diisi user
 *                                  ikut bisa ditemukan di sini)
 * @param {array}  opts.products  — daftar produk (untuk nama di riwayat)
 * @returns {{count: number}}
 */
export async function saveStokOpname({ changed, stokRows, products }) {
  const changedIds = Object.keys(changed);
  if (changedIds.length === 0) return { count: 0 };

  // Kumpulkan before + after untuk riwayat. Baris BARU (belum pernah ada di
  // stok_warna — id-nya sintetik, lihat isSyntheticStokId di ./utils.js,
  // dibuat oleh fillMissingStokRows() saat kombinasi ukuran×warna produk
  // belum tersinkron ke stok_warna, fix bug 2026-09 "belum ada data stok
  // untuk produk ini") dianggap before = 0 di semua lokasi & TIDAK boleh
  // dikirim id sintetik itu ke Supabase (kolom `id` bertipe uuid asli) —
  // biarkan Supabase generate id baru & dedup via unique constraint
  // (kode,size,warna).
  const historyRows = changedIds.map((id) => {
    const isNew = isSyntheticStokId(id);
    const row = stokRows.find((r) => String(r.id) === String(id));
    // Fallback decode dari id sintetik kalau row tidak ketemu di snapshot
    // (mis. caller lupa kirim versi gabungan) — tetap aman drpd crash.
    const fallback = isNew ? parseSyntheticStokId(id) : null;
    const kode = row?.kode ?? fallback?.kode;
    const size = row?.size ?? fallback?.size;
    const warna = row?.warna ?? fallback?.warna;
    const vals = changed[id];
    const merged = {
      gudang: vals.gudang !== undefined ? vals.gudang : (row?.gudang ?? 0),
      cideng: vals.cideng !== undefined ? vals.cideng : (row?.cideng ?? 0),
      tegalgubug: vals.tegalgubug !== undefined ? vals.tegalgubug : (row?.tegalgubug ?? 0),
    };
    return {
      id: isNew ? undefined : row?.id,
      kode,
      size,
      warna,
      before: { gudang: row?.gudang ?? 0, cideng: row?.cideng ?? 0, tegalgubug: row?.tegalgubug ?? 0 },
      after: merged,
    };
  });

  const upsertRows = historyRows.map((r) => ({
    id: r.id,
    kode: r.kode,
    size: r.size,
    warna: r.warna,
    gudang: r.after.gudang,
    cideng: r.after.cideng,
    tegalgubug: r.after.tegalgubug,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("stok_warna")
    .upsert(upsertRows, { onConflict: "kode,size,warna" });
  if (error) throw error;

  // Catat ke riwayat (best-effort, per produk yang terpengaruh) — logHistory
  // tidak pernah throw (lihat ../history/api.js), jadi aman fire-and-forget.
  const kodeSet = [...new Set(historyRows.map((r) => r.kode))];
  for (const kode of kodeSet) {
    const rowsForKode = historyRows.filter((r) => r.kode === kode);
    const prod = (products ?? []).find((p) => p.kode === kode);
    logHistory({
      action: "stok-opname",
      category: "stok",
      kode,
      nama: prod?.nama ?? kode,
      snapshot: {
        rows: rowsForKode.map((r) => ({ kode: r.kode, size: r.size, warna: r.warna, ...r.after })),
      },
      before: {
        rows: rowsForKode.map((r) => ({ kode: r.kode, size: r.size, warna: r.warna, ...r.before })),
      },
    });
  }

  return { count: changedIds.length };
}
