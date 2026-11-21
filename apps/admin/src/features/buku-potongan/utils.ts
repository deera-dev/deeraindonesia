import { SIZE_PRESETS } from "@deera/shared/lib/constants";

export const SIZE_ORDER: Record<string, number> = SIZE_PRESETS.reduce(
  (acc: Record<string, number>, p: { size: string }, i: number) => ({ ...acc, [p.size]: i }),
  {},
);

export function sortRows<T extends { size: string; warna?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const sd = (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99);
    if (sd !== 0) return sd;
    return (a.warna ?? "").localeCompare(b.warna ?? "");
  });
}

export function kodeNum(kode: string | null | undefined): number {
  const m = (kode ?? "").match(/^D-(\d+)-/);
  return m ? parseInt(m[1]!, 10) : 0;
}

export function rowKey(kode: string, size: string, warna: string): string {
  return `${kode}__${size}__${warna}`;
}

// Ratakan bentuk jsonb bertingkat {kode:{size:{warna:qty}}} (balikan
// get_sold_summary_by_variant()/get_keep_terkirim_summary_by_variant())
// jadi map datar "kode__size__warna" -> qty, dipakai sama-sama utk
// soldTotalMap & dikirimTotalMap.
export function flattenVariantMap(
  nested: Record<string, Record<string, Record<string, number>>> | null | undefined,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const [kode, sizes] of Object.entries(nested ?? {})) {
    for (const [size, warnas] of Object.entries(sizes ?? {})) {
      for (const [warna, qty] of Object.entries(warnas ?? {})) {
        m[rowKey(kode, size, warna)] = qty ?? 0;
      }
    }
  }
  return m;
}

export function selisihCls(selisih: number): string {
  if (selisih === 0) return "text-green-600 font-bold";
  if (selisih > 0) return "text-amber-600 font-bold";
  return "text-red-600 font-bold";
}

export function selisihLabel(selisih: number): string {
  if (selisih === 0) return "✓";
  if (selisih > 0) return `+${selisih}`;
  return `${selisih}`;
}
