/**
 * features/stok-opname/api.js
 * Panggilan Supabase MENTAH untuk Stok Opname — pure async, tidak ada React
 * di sini. logHistory diimport dari ../history/api (layer api, bukan hooks —
 * konsisten dengan precedent packages/shared/features/transfers/api.js).
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

export async function fetchAllStokWarna() {
  const { data } = await supabase.from("stok_warna").select("*");
  return data ?? [];
}

/**
 * saveStokOpname — upsert baris stok_warna yang berubah + catat riwayat per kode.
 *
 * @param {object} opts
 * @param {object} opts.changed   — { [rowId]: {gudang?, cideng?, tegalgubug?} }
 * @param {array}  opts.stokRows  — snapshot stok_warna saat ini (untuk before/merge)
 * @param {array}  opts.products  — daftar produk (untuk nama di riwayat)
 * @returns {{count: number}}
 */
export async function saveStokOpname({ changed, stokRows, products }) {
  const changedIds = Object.keys(changed);
  if (changedIds.length === 0) return { count: 0 };

  // Kumpulkan before + after untuk riwayat
  const historyRows = changedIds.map((id) => {
    const row = stokRows.find((r) => String(r.id) === String(id));
    const vals = changed[id];
    const merged = {
      gudang: vals.gudang !== undefined ? vals.gudang : (row.gudang ?? 0),
      cideng: vals.cideng !== undefined ? vals.cideng : (row.cideng ?? 0),
      tegalgubug: vals.tegalgubug !== undefined ? vals.tegalgubug : (row.tegalgubug ?? 0),
    };
    return {
      kode: row.kode,
      size: row.size,
      warna: row.warna,
      before: { gudang: row.gudang ?? 0, cideng: row.cideng ?? 0, tegalgubug: row.tegalgubug ?? 0 },
      after: merged,
    };
  });

  const upsertRows = historyRows.map((r) => ({
    id: stokRows.find((s) => s.kode === r.kode && s.size === r.size && s.warna === r.warna)?.id,
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
