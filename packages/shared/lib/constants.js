export const SIZE_PRESETS = [
  { size: "Midi", ld: 110, pb: 130 },
  { size: "Midi Jumbo", ld: 120, pb: 130 },
  { size: "Gamis", ld: 110, pb: 140 },
  { size: "Gamis Jumbo", ld: 120, pb: 140 },
];

export function formatHarga(val) {
  const num = parseInt(String(val ?? "").replace(/\D/g, ""), 10);
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("id-ID");
}

export function buildKode(angka, bahan) {
  const a = angka.trim();
  const b = bahan.trim().toUpperCase();
  if (!a && !b) return "";
  return `D-${a}-${b}`;
}
