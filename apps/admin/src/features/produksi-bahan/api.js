/**
 * api.js — Panggilan Supabase MENTAH untuk fitur Bahan Baku.
 * Pure async, tidak ada React. Tidak pernah diimport langsung oleh komponen.
 */
import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";

export async function fetchBahanItems(table) {
  const { data } = await supabase.from(table).select("*").order("tanggal", { ascending: false });
  return data ?? [];
}

export async function saveBahanItem({ table, payload, editing, meta, activeTab }) {
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

export async function toggleLunas(table, item) {
  const next = item.status_bayar === "lunas" ? "belum" : "lunas";
  await supabase.from(table).update({ status_bayar: next }).eq("id", item.id);
  return next;
}

export async function deleteBahanItem({ table, item, activeTab }) {
  await supabase.from(table).delete().eq("id", item.id);
  logHistory({
    action: "bahan-hapus",
    category: "produksi",
    kode: item.kode_bahan ?? "",
    nama: item.nama_bahan ?? "",
    snapshot: { ...item, sumber: activeTab },
  }).catch(() => {});
}

export async function fetchStokBahan() {
  const { data } = await supabase.from("v_stok_bahan").select("*").order("nama_bahan");
  return data ?? [];
}

// Deteksi entri duplikat: kunci (nama_bahan, kode_bahan, satuan, tanggal) sama persis.
export async function detectDupes(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("tanggal", { ascending: false });
  if (error || !data) return [];

  const map = {};
  for (const row of data) {
    const key = [
      (row.nama_bahan ?? "").trim().toLowerCase(),
      (row.kode_bahan ?? "").trim().toLowerCase(),
      (row.satuan ?? "").trim().toLowerCase(),
      row.tanggal ?? "",
    ].join("|");
    if (!map[key]) map[key] = [];
    map[key].push(row);
  }
  return Object.values(map).filter((g) => g.length > 1);
}

// Gabung tiap grup duplikat: simpan entri pertama (oldest id) sebagai master
// dengan jumlah & total_harga digabung, hapus sisanya. Return jumlah error.
export async function mergeDupeGroups(table, groups) {
  let errors = 0;
  for (const group of groups) {
    const sorted = [...group].sort((a, b) => (a.id > b.id ? 1 : -1));
    const master = sorted[0];
    const rest = sorted.slice(1);

    const totalJumlah = group.reduce((s, r) => s + Number(r.jumlah ?? 0), 0);
    const totalHarga = group.reduce((s, r) => s + Number(r.total_harga ?? 0), 0);

    const { error: updateErr } = await supabase
      .from(table)
      .update({ jumlah: totalJumlah, total_harga: totalHarga })
      .eq("id", master.id);

    if (updateErr) {
      errors++;
      continue;
    }

    for (const dup of rest) {
      const { error: delErr } = await supabase.from(table).delete().eq("id", dup.id);
      if (delErr) errors++;
    }
  }
  return errors;
}
