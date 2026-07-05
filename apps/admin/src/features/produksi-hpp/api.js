/**
 * api.js — Panggilan Supabase MENTAH untuk fitur template HPP.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
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

/**
 * Simpan satu atau lebih payload template HPP (satu per produk dalam gelaran).
 * `templates` adalah daftar template SAAT INI (dari cache query pemanggil) — dipakai
 * untuk menentukan insert vs update serta menyusun snapshot "before" untuk audit log,
 * mengikuti pola updateBatch() di fitur produksi-record (lookup data dikirim eksplisit
 * oleh pemanggil, bukan diambil dari cache di dalam api.js).
 */
export async function saveHppTemplates(payloads, { templates, userEmail }) {
  const arr = Array.isArray(payloads) ? payloads : [payloads];
  for (const payload of arr) {
    const record = { ...payload, updated_at: new Date().toISOString(), updated_by: userEmail };
    const existing = templates.find((t) => t.kode_produk === payload.kode_produk);
    if (existing) {
      await supabase.from("hpp_template").update(record).eq("id", existing.id).throwOnError();
    } else {
      await supabase.from("hpp_template").insert(record).throwOnError();
    }
    if (payload.kode_produk && payload.total_hpp > 0) {
      await supabase
        .from("products")
        .update({ hpp: payload.total_hpp })
        .eq("kode", payload.kode_produk);
    }
    logHistory({
      action: "hpp-simpan",
      category: "produksi",
      kode: payload.kode_produk ?? "",
      nama: payload.kode_produk ?? "",
      snapshot: { total_hpp: payload.total_hpp, bahan_items: payload.bahan_items },
      before: existing
        ? { total_hpp: existing.total_hpp, bahan_items: existing.bahan_items }
        : undefined,
    }).catch(() => {});
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

export async function saveHppConfigValue(key, nilai, userEmail) {
  await supabase
    .from("hpp_config")
    .update({ nilai, updated_at: new Date().toISOString(), updated_by: userEmail })
    .eq("key", key);
}
