// utils.js — Helper tampilan fitur pasar-restock. Tidak ada I/O.
// Aturan bisnis (target, hampir habis, tidak bergerak) ada di backend: RPC get_pasar_restock.

// Hanya untuk teks penjelasan di UI — nilai sebenarnya dipakai backend (default RPC).
export const TARGET_SERI_QTY = 3;
export const TIDAK_BERGERAK_DAYS = 14;

export const MARKETS = ["cideng", "tegalgubug"];

// ── Pasar tujuan default: pasar yang buka BESOK (H-1 dari hari ini) ───────────
// Senin(1)/Kamis(4) → Cideng, Jumat(5) → Tegalgubug, hari lain → null (biarkan
// user pilih manual — tidak ada pasar besok).
export function getDefaultTargetMarket(today = new Date()) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.getDay();
  if (day === 1 || day === 4) return "cideng";
  if (day === 5) return "tegalgubug";
  return null;
}

export function marketLabel(market) {
  if (market === "cideng") return "Cideng";
  if (market === "tegalgubug") return "Tegalgubug";
  return "-";
}
