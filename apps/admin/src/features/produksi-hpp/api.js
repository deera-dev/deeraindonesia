import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

export async function fetchHppTemplates() {
  const { data } = await supabase
    .from("hpp_template")
    .select("*")
    .order("kode_produk", { ascending: false });
  return data ?? [];
}

export async function fetchHppConfig() {
  const { data } = await supabase.from("hpp_config").select("*");
  const map = {};
  for (const r of data ?? []) map[r.key] = r.nilai;
  return map;
}

export async function fetchHppConfigRows() {
  const { data } = await supabase.from("hpp_config").select("*").order("key");
  return data ?? [];
}

export async function fetchBahanOptions() {
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
      _type: "beli",
      _label: `[Beli] ${r.nama_bahan}${r.kode_bahan ? " (" + r.kode_bahan + ")" : ""}`,
    })),
    ...(pinjam ?? []).map((r) => ({
      ...r,
      _type: "pinjam",
      _label: `[Pinjam] ${r.nama_bahan}${r.kode_bahan ? " (" + r.kode_bahan + ")" : ""}`,
    })),
  ];
}

// save_hpp_template dulu 2 tulis berurutan tanpa transaction per payload
// (upsert hpp_template, lalu update products.hpp) + lookup "existing"
// dari snapshot client yang bisa basi. Sekarang 1 RPC atomik yang juga
// baca state terbaru langsung dari DB — lihat
// supabase/migrations/20261120_save_hpp_template_config.sql.
export async function saveHppTemplates(payloads) {
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

export async function deleteHppTemplate(target) {
  await supabase.from("hpp_template").delete().eq("id", target.id);
  logHistory({
    action: "hpp-hapus",
    category: "produksi",
    kode: target.kode_produk ?? "",
    nama: target.kode_produk ?? "",
    snapshot: { total_hpp: target.total_hpp },
  }).catch(() => {});
}

// Identitas (updated_by) diambil RPC dari auth.uid() -> profiles, bukan
// parameter client lagi — lihat
// supabase/migrations/20261120_save_hpp_template_config.sql.
export async function saveHppConfigValue(key, nilai) {
  const { error } = await supabase.rpc("save_hpp_config_value", { p_key: key, p_nilai: nilai });
  if (error) throw new Error(error.message);
}
