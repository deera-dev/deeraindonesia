import { supabase } from "@deera/shared/lib/supabase";
import type {
  BukuPotonganData,
  CheckStokSemuaParams,
  CheckStokSemuaResult,
  JahitDikerjakanRow,
  OverflowPlan,
  PlanOpnameOverflowParams,
  SaveStokOpnameParams,
  StokWarnaRow,
} from "./schema";
import { isSyntheticStokId, parseSyntheticStokId } from "./utils";

export async function fetchAllStokWarna(): Promise<StokWarnaRow[]> {
  const { data } = await supabase.from("stok_warna").select("*");
  return data ?? [];
}

export async function fetchJahitDikerjakan(): Promise<JahitDikerjakanRow[]> {
  const { data, error } = await supabase.from("v_jahit_dikerjakan").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function saveStokOpname({
  changed,
  stokRows,
}: SaveStokOpnameParams): Promise<{ count: number }> {
  const changedIds = Object.keys(changed);
  if (changedIds.length === 0) return { count: 0 };

  const historyRows = changedIds.map((id) => {
    const isNew = isSyntheticStokId(id);
    const row = stokRows.find((r) => String(r.id) === String(id));
    const fallback = isNew ? parseSyntheticStokId(id) : null;
    const kode = row?.kode ?? fallback?.kode;
    const size = row?.size ?? fallback?.size;
    const warna = row?.warna ?? fallback?.warna;
    const vals = changed[id]!;
    const merged = {
      gudang: vals.gudang !== undefined ? vals.gudang : (row?.gudang ?? 0),
      cideng: vals.cideng !== undefined ? vals.cideng : (row?.cideng ?? 0),
      tegalgubug: vals.tegalgubug !== undefined ? vals.tegalgubug : (row?.tegalgubug ?? 0),
      ngorder: vals.ngorder !== undefined ? vals.ngorder : (row?.ngorder ?? 0),
    };
    return {
      kode,
      size,
      warna,
      before: {
        gudang: row?.gudang ?? 0,
        cideng: row?.cideng ?? 0,
        tegalgubug: row?.tegalgubug ?? 0,
        ngorder: row?.ngorder ?? 0,
      },
      after: merged,
    };
  });

  const { data, error } = await supabase.functions.invoke("stok-opname-crud", {
    body: { action: "save", input: { rows: historyRows } },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return { count: changedIds.length };
}

export async function planOpnameOverflow({
  kode,
  loc,
  changes,
}: PlanOpnameOverflowParams): Promise<OverflowPlan> {
  if (!changes?.length) return { overflow: false, sizes: [] };
  const { data, error } = await supabase.rpc("plan_opname_overflow", {
    p_kode: kode,
    p_loc: loc,
    p_changes: changes,
  });
  if (error) throw error;
  return data ?? { overflow: false, sizes: [] };
}

export async function checkStokSemua({
  kode,
  rows,
}: CheckStokSemuaParams): Promise<CheckStokSemuaResult> {
  if (!rows?.length) return { over: [] };
  const { data, error } = await supabase.rpc("check_stok_semua", { p_kode: kode, p_rows: rows });
  if (error) throw error;
  return data ?? { over: [] };
}

export async function fetchBukuPotongan(): Promise<BukuPotonganData> {
  const { data, error } = await supabase.rpc("get_buku_potongan");
  if (error) throw error;
  return data ?? { rows: {}, sizes: {}, kodes: {} };
}
