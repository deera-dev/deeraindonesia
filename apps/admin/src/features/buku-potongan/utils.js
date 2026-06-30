/**
 * bukuUtils.js — Helper untuk halaman Buku Potongan.
 */
import { SIZE_PRESETS } from "@deera/shared/lib/constants";

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

export function rowKey(kode, size, warna) {
  return `${kode}__${size}__${warna}`;
}

export function selisihCls(selisih) {
  if (selisih === 0) return "text-green-600 font-bold";
  if (selisih > 0) return "text-amber-600 font-bold";
  return "text-red-600 font-bold";
}

export function selisihLabel(selisih) {
  if (selisih === 0) return "✓";
  if (selisih > 0) return `+${selisih}`;
  return `${selisih}`;
}
