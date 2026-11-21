import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import type {
  BahanOption,
  DeleteHppTemplateTarget,
  HppConfigMap,
  HppConfigRow,
  HppTemplate,
  SaveHppTemplatePayload,
} from "./schema";

export async function fetchHppTemplates(): Promise<HppTemplate[]> {
  const { data } = await supabase
    .from("hpp_template")
    .select("*")
    .order("kode_produk", { ascending: false });
  return data ?? [];
}

export async function fetchHppConfig(): Promise<HppConfigMap> {
  const { data } = await supabase.from("hpp_config").select("*");
  const map: HppConfigMap = {};
  for (const r of data ?? []) map[r.key] = r.nilai;
  return map;
}

export async function fetchHppConfigRows(): Promise<HppConfigRow[]> {
  const { data } = await supabase.from("hpp_config").select("*").order("key");
  return data ?? [];
}

export async function fetchBahanOptions(): Promise<BahanOption[]> {
  const [{ data: beli }, { data: pinjam }] = await Promise.all([
    supabase
      .from("bahan_pembelian")
      .select("id,nama_bahan,kode_bahan,satuan,harga_satuan,jumlah")
      .order("nama_bahan"),
    supabase
      .from("bahan_pinjam")
      .select("id,nama_bahan,kode_bahan,satuan,harga_satuan,jumlah")
      .order("nama_bahan"),
  ]);
  return [
    ...(beli ?? []).map((r) => ({
      ...r,
      _type: "beli" as const,
      _label: `[Beli] ${r.nama_bahan}${r.kode_bahan ? ` (${r.kode_bahan})` : ""}`,
    })),
    ...(pinjam ?? []).map((r) => ({
      ...r,
      _type: "pinjam" as const,
      _label: `[Pinjam] ${r.nama_bahan}${r.kode_bahan ? ` (${r.kode_bahan})` : ""}`,
    })),
  ];
}

export async function saveHppTemplates(
  payloads: SaveHppTemplatePayload | SaveHppTemplatePayload[],
): Promise<number> {
  const arr = Array.isArray(payloads) ? payloads : [payloads];
  for (const payload of arr) {
    const { error } = await supabase.rpc("save_hpp_template", {
      p_kode_produk: payload.kode_produk,
      p_bahan_items: payload.bahan_items,
      p_upah_jahit: payload.upah_jahit,
      p_bordir: payload.bordir,
      p_biaya_studio: payload.biaya_studio,
      p_jumlah_baju_studio: payload.jumlah_baju_studio,
      p_kancing_qty: payload.kancing_qty,
      p_kancing_extra: payload.kancing_extra,
      p_catatan: payload.catatan,
      p_config_snapshot: payload.config_snapshot,
      p_total_hpp: payload.total_hpp,
    });
    if (error) throw new Error(error.message);
  }
  return arr.length;
}

export async function deleteHppTemplate(target: DeleteHppTemplateTarget): Promise<void> {
  await supabase.from("hpp_template").delete().eq("id", target.id);
  logHistory({
    action: "hpp-hapus",
    category: "produksi",
    kode: target.kode_produk ?? "",
    nama: target.kode_produk ?? "",
    snapshot: { total_hpp: target.total_hpp },
  }).catch(() => {});
}

export async function saveHppConfigValue(key: string, nilai: number): Promise<void> {
  const { error } = await supabase.rpc("save_hpp_config_value", { p_key: key, p_nilai: nilai });
  if (error) throw new Error(error.message);
}
