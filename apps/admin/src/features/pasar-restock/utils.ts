// Default target minimal pcs per warna di tiap pasar — admin: "sekarang
// default minimal seri pasar cideng adalah 2, tegalgubuk minimal 3, tapi
// tetap bisa di edit minimal serinya". Nilai AKTUAL yang dipakai (termasuk
// hasil edit admin) disimpan di store.js (Zustand + persist), ini cuma
// default awal/fallback.
export const DEFAULT_TARGET_SERI: Record<string, number> = { cideng: 2, tegalgubug: 3 };
export const TIDAK_BERGERAK_DAYS = 14;

export const MARKETS = ["cideng", "tegalgubug"];

export function getDefaultTargetMarket(today: Date = new Date()): string | null {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.getDay();
  if (day === 1 || day === 4) return "cideng";
  if (day === 5) return "tegalgubug";
  return null;
}

export function marketLabel(market: string | null | undefined): string {
  if (market === "cideng") return "Cideng";
  if (market === "tegalgubug") return "Tegalgubug";
  return "-";
}

// Kunci unik per baris restock (kode x ukuran x warna) — dipakai utk state
// checklist "tambahkan ke transfer" di PasarRestockPage.
export function restockItemKey(kode: string, size: string, warna: string): string {
  return `${kode}__${size}__${warna}`;
}

// Transfer SELALU dari Gudang (lihat handleBuatTransfer) — qty yang
// dikirim TIDAK BOLEH lebih dari stok Gudang yang benar-benar ada
// sekarang, walau "butuh" (target - stok pasar) lebih besar dari itu.
// BUG FIX (November 2026, laporan admin: transfer kebuat qty 2 padahal
// Gudang cuma ada 1) — approve_transfer() menambahkan FULL qty ke lokasi
// tujuan tanpa mengecek stok asal cukup atau tidak (cuma clamp lokasi
// asal ke 0), jadi kalau "butuh" > stok Gudang, approve transfer ini
// akan menciptakan stok dari udara di pasar tujuan.
export function restockTransferQty(d: { butuh?: number; gudangQty?: number }): number {
  return Math.max(0, Math.min(d.butuh ?? 0, d.gudangQty ?? 0));
}
