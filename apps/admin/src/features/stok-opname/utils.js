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

// Urutan sama seperti daftar produk di halaman Produk (permintaan Denny
// 2026-08): produk terbaru dibuat duluan (created_at desc), lalu nama A-Z
// sebagai tiebreak kalau created_at sama. Sebelumnya di sini masih pakai
// urutan lama (kodeNum desc) dan tidak ikut kebijakan default itu.
export function sortProductsTerbaru(products) {
  const byNama = (a, b) => (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" });
  const byTanggal = (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "");
  return [...products].sort((a, b) => {
    const d = -byTanggal(a, b);
    return d !== 0 ? d : byNama(a, b);
  });
}

// Key konsisten kode+ukuran (TANPA warna — permintaan Denny), dipakai untuk
// mencocokkan produk di Stok Opname dengan agregat "sudah dikerjakan" dari
// v_jahit_dikerjakan (lihat features/stok-opname/api.js
// fetchJahitDikerjakan()). Semua warna digabung jadi satu total per
// kode+ukuran karena staf Tim Jahit sering tidak mengisi warna spesifik
// saat input kartu jahit (kartu_items.warna kosong) — memisah per-warna
// bikin data itu tidak pernah cocok ke baris manapun.
export function dikerjakanKey(kode, size) {
  return `${kode}|${size}`;
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
