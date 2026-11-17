
export const LOCATIONS = ["gudang", "cideng", "tegalgubug"];

export const LOCATION_LABELS = {
  gudang: "Gudang",
  cideng: "Cideng",
  tegalgubug: "Tegalgubug",
  ngorder: "Ngorder",
};

// Stok ngorder (dibawa keliling toko) BUKAN lokasi jualan/pasar — tidak masuk
// LOCATIONS (dipakai getMarketLocation, laporan per pasar, BEP, dst). Cuma
// dipakai di Transfer, supaya ngorder bisa jadi "dari"/"ke" selain 3 lokasi
// stok biasa.
export const TRANSFER_LOCATIONS = [...LOCATIONS, "ngorder"];

export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function getMarketLocation(date = new Date()) {
  const day = date.getDay();
  if (day === 1 || day === 4) return "cideng";
  if (day === 5) return "tegalgubug";
  return "gudang";
}

export function getMarketLabel(loc) {
  return LOCATION_LABELS[loc] ?? loc;
}

export function getTodayInfo() {
  const now = new Date();
  const loc = getMarketLocation(now);
  const label = getMarketLabel(loc);
  const day = DAY_NAMES[now.getDay()];
  return { loc, label, day };
}
