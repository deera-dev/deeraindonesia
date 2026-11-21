import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import type {
  BahanItemRow,
  BahanTable,
  DeleteBahanItemArgs,
  DupeGroup,
  SaveBahanItemArgs,
  StokBahanRow,
} from "./schema";

export async function fetchBahanItems(table: BahanTable): Promise<BahanItemRow[]> {
  const { data } = await supabase.from(table).select("*").order("tanggal", { ascending: false });
  return data ?? [];
}

export async function saveBahanItem({
  table,
  payload,
  editing,
  meta,
  activeTab,
}: SaveBahanItemArgs): Promise<void> {
  if (Array.isArray(payload)) {
    await supabase
      .from(table)
      .insert(payload.map((p) => ({ ...p, ...meta })))
      .throwOnError();
  } else if (editing) {
    await supabase
      .from(table)
      .update({ ...payload, ...meta })
      .eq("id", editing.id)
      .throwOnError();
  } else {
    await supabase
      .from(table)
      .insert({ ...payload, ...meta })
      .throwOnError();
  }
  logHistory({
    action: activeTab === "pinjam" ? "bahan-pinjam" : "bahan-beli",
    category: "produksi",
    kode: Array.isArray(payload)
      ? (payload[0]?.kode_bahan ?? "")
      : (payload.kode_bahan ?? editing?.kode_bahan ?? ""),
    nama: Array.isArray(payload)
      ? (payload[0]?.nama_bahan ?? "")
      : (payload.nama_bahan ?? editing?.nama_bahan ?? ""),
    snapshot: Array.isArray(payload) ? { bulk: payload.length } : payload,
    before: editing ? { ...editing } : undefined,
  }).catch(() => {});
}

export async function toggleLunas(
  table: BahanTable,
  item: BahanItemRow,
): Promise<"lunas" | "belum"> {
  const next = item.status_bayar === "lunas" ? "belum" : "lunas";
  await supabase.from(table).update({ status_bayar: next }).eq("id", item.id);
  return next;
}

export async function deleteBahanItem({
  table,
  item,
  activeTab,
}: DeleteBahanItemArgs): Promise<void> {
  await supabase.from(table).delete().eq("id", item.id);
  logHistory({
    action: "bahan-hapus",
    category: "produksi",
    kode: item.kode_bahan ?? "",
    nama: item.nama_bahan ?? "",
    snapshot: { ...item, sumber: activeTab },
  }).catch(() => {});
}

export async function fetchStokBahan(): Promise<StokBahanRow[]> {
  const { data } = await supabase.from("v_stok_bahan").select("*").order("nama_bahan");
  return data ?? [];
}

export async function detectDupes(table: BahanTable): Promise<DupeGroup[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("tanggal", { ascending: false });
  if (error || !data) return [];

  const map: Record<string, BahanItemRow[]> = {};
  for (const row of data) {
    const key = [
      (row.nama_bahan ?? "").trim().toLowerCase(),
      (row.kode_bahan ?? "").trim().toLowerCase(),
      (row.satuan ?? "").trim().toLowerCase(),
      row.tanggal ?? "",
    ].join("|");
    if (!map[key]) map[key] = [];
    map[key]!.push(row);
  }
  return Object.values(map).filter((g) => g.length > 1);
}

export async function mergeDupeGroups(table: BahanTable, groups: DupeGroup[]): Promise<number> {
  let errors = 0;
  for (const group of groups) {
    const sorted = [...group].sort((a, b) => (a.id > b.id ? 1 : -1));
    const master = sorted[0]!;
    const rest = sorted.slice(1);

    const totalJumlah = group.reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
    const totalHarga = group.reduce((s, r) => s + Number(r.total_harga ?? 0), 0);

    const { error } = await supabase.rpc("merge_bahan_dupe_group", {
      p_table: table,
      p_master_id: master.id,
      p_dupe_ids: rest.map((r) => r.id),
      p_jumlah: totalJumlah,
      p_total_harga: totalHarga,
    });
    if (error) errors++;
  }
  return errors;
}
