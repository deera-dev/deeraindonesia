/**
 * recordUtils.js — Helper untuk halaman catatan produksi batch.
 */

export function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function genBatchNo() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PROD-${d}-${Math.floor(Math.random() * 900 + 100)}`;
}

export function buildKode(angka, bahan) {
  const a = String(angka ?? "").trim();
  const b = String(bahan ?? "")
    .trim()
    .toUpperCase();
  if (!a && !b) return "";
  return `D-${a}-${b}`;
}

export const inputCls =
  "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
export const labelCls =
  "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";
