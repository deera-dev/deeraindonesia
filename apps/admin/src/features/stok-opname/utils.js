/**
 * features/stok-opname/utils.js — pure helpers untuk halaman Stok Opname.
 */
import { SIZE_PRESETS } from "@deera/shared/lib/constants";

export const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "TegalGubug" },
];

// Urutan size sesuai SIZE_PRESETS
export const SIZE_ORDER = SIZE_PRESETS.reduce((acc, p, i) => ({ ...acc, [p.size]: i }), {});

export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const sd = (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99);
    if (sd !== 0) return sd;
    return (a.warna ?? "").localeCompare(b.warna ?? "");
  });
}

export function kodeNum(kode) {
  const m = (kode ?? "").match(/^D-(\d+)-/);
  return m ? parseInt(m[1], 10) : 0;
}

export const SIZE_COLORS = {
  Midi: "text-cyan-500 dark:text-cyan-400",
  "Midi Jumbo": "text-indigo-500 dark:text-indigo-400",
  Gamis: "text-emerald-500 dark:text-emerald-400",
  "Gamis Jumbo": "text-orange-500 dark:text-orange-400",
};

// Konfigurasi 3 kartu grand-total (sekaligus filter lokasi) di header.
export const MKT_CARDS = [
  {
    key: "gudang",
    lbl: "GD",
    name: "Gudang",
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    activeBorder: "border-sky-400 dark:border-sky-500",
    inactiveBorder: "border-transparent",
  },
  {
    key: "cideng",
    lbl: "CD",
    name: "Cideng",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    activeBorder: "border-violet-400 dark:border-violet-500",
    inactiveBorder: "border-transparent",
  },
  {
    key: "tegalgubug",
    lbl: "TG",
    name: "Tegal",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    activeBorder: "border-rose-400 dark:border-rose-500",
    inactiveBorder: "border-transparent",
  },
];
