export interface SizePreset {
  size: string;
  ld: number;
  pb: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { size: "Midi", ld: 110, pb: 130 },
  { size: "Midi Jumbo", ld: 120, pb: 130 },
  { size: "Gamis", ld: 110, pb: 140 },
  { size: "Gamis Jumbo", ld: 120, pb: 140 },
  { size: "Super Jumbo", ld: 130, pb: 140 },
];

export function formatHarga(val: number | string | null | undefined): string {
  // [^-\d] keeps a leading "-" so negative values (e.g. a loss-making
  // margin) aren't silently rendered as a positive number - only digits
  // and "Rp"/"."/space-style separators get stripped.
  const num = parseInt(String(val ?? "").replace(/[^-\d]/g, ""), 10);
  if (Number.isNaN(num) || num === 0) return "";
  return num.toLocaleString("id-ID");
}

export function buildKode(angka: string, bahan: string): string {
  const a = angka.trim();
  const b = bahan.trim().toUpperCase();
  if (!a && !b) return "";
  return `D-${a}-${b}`;
}
