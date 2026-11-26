import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import { isSyntheticStokId, parseSyntheticStokId } from "./utils";

export async function fetchAllStokWarna() {
  const { data } = await supabase.from("stok_warna").select("*");
  return data ?? [];
}

export async function fetchJahitDikerjakan() {
  const { data, error } = await supabase.from("v_jahit_dikerjakan").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCycleCountChecked() {
  const { data, error } = await supabase.from("cycle_count_checked").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCycleCountKategori(days = 90) {
  const { data, error } = await supabase.rpc("get_cycle_count_kategori", { p_days: days });
  if (error) throw error;
  return data ?? {};
}

export async function saveStokOpname({ changed, stokRows, products }) {
  const changedIds = Object.keys(changed);
  if (changedIds.length === 0) return { count: 0 };

  const historyRows = changedIds.map((id) => {
    const isNew = isSyntheticStokId(id);
    const row = stokRows.find((r) => String(r.id) === String(id));
    const fallback = isNew ? parseSyntheticStokId(id) : null;
    const kode = row?.kode ?? fallback?.kode;
    const size = row?.size ?? fallback?.size;
    const warna = row?.warna ?? fallback?.warna;
    const vals = changed[id];
    const merged = {
      gudang: vals.gudang !== undefined ? vals.gudang : (row?.gudang ?? 0),
      cideng: vals.cideng !== undefined ? vals.cideng : (row?.cideng ?? 0),
      tegalgubug: vals.tegalgubug !== undefined ? vals.tegalgubug : (row?.tegalgubug ?? 0),
      ngorder: vals.ngorder !== undefined ? vals.ngorder : (row?.ngorder ?? 0),
    };
    return {
      id: isNew ? undefined : row?.id,
      kode,
      size,
      warna,
      before: { gudang: row?.gudang ?? 0, cideng: row?.cideng ?? 0, tegalgubug: row?.tegalgubug ?? 0, ngorder: row?.ngorder ?? 0 },
      after: merged,
    };
  });

  const upsertRows = historyRows.map((r) => {
    const base = {
      kode: r.kode,
      size: r.size,
      warna: r.warna,
      gudang: r.after.gudang,
      cideng: r.after.cideng,
      tegalgubug: r.after.tegalgubug,
      ngorder: r.after.ngorder,
      updated_at: new Date().toISOString(),
    };
    return r.id ? { id: r.id, ...base } : base;
  });

  const existingRows = upsertRows.filter((r) => "id" in r);
  const newRows = upsertRows.filter((r) => !("id" in r));

  if (existingRows.length > 0) {
    const { error } = await supabase
      .from("stok_warna")
      .upsert(existingRows, { onConflict: "kode,size,warna" });
    if (error) throw error;
  }
  if (newRows.length > 0) {
    const { error } = await supabase
      .from("stok_warna")
      .upsert(newRows, { onConflict: "kode,size,warna" });
    if (error) throw error;
  }

  // Cycle Counting berbasis risiko (lihat utils.js computeDueList): catat
  // kode+lokasi yang baru saja dihitung FISIK di sesi ini, supaya kode itu
  // tidak "jatuh tempo" lagi sampai batas hari kategorinya lewat. Lokasi
  // diambil dari kunci object `changed[id]` yang betulan disentuh sesi ini
  // (bisa 1 lokasi atau "semua"), bukan parameter terpisah -- best-effort,
  // gagal catat TIDAK membatalkan simpan stok opname-nya sendiri.
  const checkedPairs = new Set();
  changedIds.forEach((id, i) => {
    const kode = historyRows[i]?.kode;
    if (!kode) return;
    for (const loc of Object.keys(changed[id] ?? {})) {
      checkedPairs.add(`${kode}__${loc}`);
    }
  });
  if (checkedPairs.size > 0) {
    const now = new Date().toISOString();
    const rows = [...checkedPairs].map((pair) => {
      const idx = pair.lastIndexOf("__");
      return { kode: pair.slice(0, idx), location: pair.slice(idx + 2), checked_at: now };
    });
    const { error } = await supabase
      .from("cycle_count_checked")
      .upsert(rows, { onConflict: "kode,location" });
    if (error) console.warn("[saveStokOpname] gagal catat cycle_count_checked:", error.message);
  }

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

export async function planOpnameOverflow({ kode, loc, changes }) {
  if (!changes?.length) return { overflow: false, sizes: [] };
  const { data, error } = await supabase.rpc("plan_opname_overflow", {
    p_kode: kode,
    p_loc: loc,
    p_changes: changes,
  });
  if (error) throw error;
  return data ?? { overflow: false, sizes: [] };
}

export async function checkStokSemua({ kode, rows }) {
  if (!rows?.length) return { over: [] };
  const { data, error } = await supabase.rpc("check_stok_semua", { p_kode: kode, p_rows: rows });
  if (error) throw error;
  return data ?? { over: [] };
}

export async function fetchBukuPotongan() {
  const { data, error } = await supabase.rpc("get_buku_potongan");
  if (error) throw error;
  return data ?? { rows: {}, sizes: {}, kodes: {} };
}
