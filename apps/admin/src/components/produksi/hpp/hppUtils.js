/**
 * hppUtils.js — Helper functions untuk kalkulasi HPP.
 */
import { supabase } from "@deera/shared/lib/supabase";

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

/** Format desimal, hilangkan trailing zeros */
export function fmt4(n) {
  return Number(n)
    .toFixed(4)
    .replace(/\.?0+$/, "");
}

export const LENGTH_UNITS = new Set(["yard", "meter", "m", "cm"]);

export function convertUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return value;
  const norm = (u) => (u === "m" ? "meter" : u);
  const f = norm(fromUnit);
  const t = norm(toUnit);
  if (f === t) return value;
  if (!LENGTH_UNITS.has(f) || !LENGTH_UNITS.has(t)) return value;
  const toMeter = { yard: 0.9144, meter: 1, cm: 0.01 };
  const fromMeter = { yard: 1 / 0.9144, meter: 1, cm: 100 };
  return value * (toMeter[f] ?? 1) * (fromMeter[t] ?? 1);
}

/** Opsi satuan ukur berdasarkan satuan beli */
export function satuanUkurOptions(satuanBeli) {
  if (LENGTH_UNITS.has(satuanBeli)) return ["yard", "meter", "cm"];
  return [satuanBeli];
}

/** Hitung qty_per_baju (dalam satuan beli) dari item */
export function calcQtyPerBaju(item) {
  const qtyRaw = Number(item.qty_dipakai) || 0;
  const nBaju = Math.max(Number(item.untuk_n_baju) || 1, 1);
  const perBaju = qtyRaw / nBaju;
  return convertUnit(perBaju, item.satuan_ukur || item.satuan, item.satuan);
}

/** Normalise item dari DB (backward compat) */
export function normItem(b) {
  const hasTambahan = b.qty_dipakai !== undefined && b.untuk_n_baju !== undefined;
  const jenis = b.jenis ?? (hasTambahan ? "tambahan" : "motif");
  return {
    ...b,
    jenis,
    qty_dipakai: b.qty_dipakai ?? b.qty_per_baju ?? "",
    satuan_ukur: b.satuan_ukur ?? b.satuan ?? "yard",
    untuk_n_baju: b.untuk_n_baju ?? 1,
  };
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

export async function fetchConfig() {
  const { data } = await supabase.from("hpp_config").select("*");
  const map = {};
  for (const r of data ?? []) map[r.key] = r.nilai;
  return map;
}

/**
 * Hitung total HPP.
 * biaya_studio = nilai per baju (sudah dihitung: config.studio ÷ jumlah_baju_studio)
 */
export function calcTotal({ bahanItems, upah_jahit, bordir, kancing_qty, biaya_studio, config }) {
  const biayaKain = bahanItems.reduce(
    (s, b) => s + calcQtyPerBaju(b) * (Number(b.harga_satuan) || 0),
    0,
  );
  const kancingSatuan = config?.kancing_satuan ?? 500;
  const kancingQty = Number(kancing_qty) || 0;
  const biayaKancing = kancingQty * kancingSatuan;

  const breakdown = [
    { label: "Upah Jahit", val: Number(upah_jahit) || 0 },
    { label: "Bordir", val: Number(bordir) || 0 },
    { label: "Biaya Studio", val: Number(biaya_studio) || 0 },
    { label: `Kancing (${kancingQty} × ${fmtRp(kancingSatuan)})`, val: biayaKancing },
    { label: "Plastik", val: config?.plastik ?? 1800 },
    { label: "Hangtag", val: config?.hangtag ?? 200 },
    { label: "Tali Hangtag", val: config?.tali_hangtag ?? 100 },
    { label: "Merk", val: config?.merk ?? 200 },
    { label: "Pin", val: config?.pin ?? 2800 },
    { label: "Kain Keras", val: config?.kain_keras ?? 200 },
    { label: "Poin Denny", val: config?.poin_denny ?? 10000 },
    { label: "Poin Haikal", val: config?.poin_haikal ?? 10000 },
  ];
  const komponen = breakdown.reduce((s, b) => s + b.val, 0);
  return {
    biayaKain: Math.round(biayaKain),
    komponen,
    total: Math.round(biayaKain + komponen),
    breakdown,
  };
}
