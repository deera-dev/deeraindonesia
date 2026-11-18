// Default target minimal pcs per warna di tiap pasar — admin: "sekarang
// default minimal seri pasar cideng adalah 2, tegalgubuk minimal 3, tapi
// tetap bisa di edit minimal serinya". Nilai AKTUAL yang dipakai (termasuk
// hasil edit admin) disimpan di store.js (Zustand + persist), ini cuma
// default awal/fallback.
export const DEFAULT_TARGET_SERI = { cideng: 2, tegalgubug: 3 };
export const TIDAK_BERGERAK_DAYS = 14;

export const MARKETS = ["cideng", "tegalgubug"];

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

// Kunci unik per baris restock (kode x ukuran x warna) — dipakai utk state
// checklist "tambahkan ke transfer" di PasarRestockPage.
export function restockItemKey(kode, size, warna) {
  return `${kode}__${size}__${warna}`;
}
