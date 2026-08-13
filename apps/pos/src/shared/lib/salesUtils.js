/**
 * salesUtils.js
 * Fungsi helper yang dipakai di beberapa modul POS (Kasir, Laporan, Struk).
 * Pisahkan di sini agar tidak duplikat antar file.
 */

import { LOCATIONS, LOCATION_LABELS } from "@deera/shared/lib/marketDay";

/**
 * Hitung total qty satu item di keranjang.
 * Item bisa berbasis warna (array) atau simple (angka).
 * @param {{ warna?: {qty:number}[], qty?: number }} item
 * @returns {number}
 */
export function effectiveQty(item) {
  // Gunakan Array.isArray agar aman untuk warna yang berupa string (data lama)
  if (Array.isArray(item.warna) && item.warna.length > 0) {
    return item.warna.reduce((s, w) => s + (w.qty ?? 0), 0);
  }
  return item.qty ?? 0;
}

/**
 * Hitung keuntungan satu item (harga - HPP) × qty.
 * @param {{ harga: number, hpp?: number, warna?, qty? }} item
 * @returns {number}
 */
export function itemProfit(item) {
  const qty = effectiveQty(item);
  return ((item.harga ?? 0) - (item.hpp ?? 0)) * qty;
}

/**
 * Format tanggal ISO ke string Indonesia: "12 Jan 2025, 09:30"
 * @param {string|null} iso
 * @returns {string}
 */
export function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Format tanggal+jam struk: "13 Agustus 2026, 23:42 WIB".
 * Dipakai di StrukContent.jsx (Versi A) DAN useTsplPrinter.js (Versi B) —
 * SENGAJA satu sumber di sini supaya kedua versi struk selalu konsisten
 * (tidak drift kalau salah satu diedit tanpa yang lain).
 * Manual (bukan toLocaleString) supaya hasilnya konsisten di semua
 * browser/environment, selalu pakai ":" (bukan ".") + akhiran "WIB".
 * @param {string|null} iso
 * @returns {string}
 */
export function formatStrukDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = BULAN_ID[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm} WIB`;
}

/**
 * Ambil stok warna tertentu untuk satu produk/ukuran/lokasi.
 * Bergantung pada `product.stokByWarna` yang diisi oleh useProducts.js.
 * @param {object} product
 * @param {string} size
 * @param {string} warnaName
 * @param {string} loc  - "gudang" | "cideng" | "tegalgubug"
 * @returns {number}
 */
export function getStokWarna(product, size, warnaName, loc) {
  return product.stokByWarna?.[size]?.[warnaName]?.[loc] ?? 0;
}

/**
 * Hitung total stok semua warna untuk satu ukuran + lokasi.
 * @param {object} product
 * @param {string} size
 * @param {string} loc
 * @returns {number}
 */
export function getTotalStokVariant(product, size, loc) {
  return Object.values(product.stokByWarna?.[size] ?? {}).reduce((s, v) => s + (v[loc] ?? 0), 0);
}
/**
 * Stok satu warna di SEMUA lokasi sekaligus.
 * @param {object} product
 * @param {string} size
 * @param {string} warnaName
 * @returns {{gudang:number, cideng:number, tegalgubug:number}}
 */
export function getStokAllLocations(product, size, warnaName) {
  return (
    product.stokByWarna?.[size]?.[warnaName] ?? { gudang: 0, cideng: 0, tegalgubug: 0 }
  );
}

/**
 * Total stok satu warna digabung 3 lokasi.
 * @param {object} product
 * @param {string} size
 * @param {string} warnaName
 * @returns {number}
 */
export function getCombinedStok(product, size, warnaName) {
  const s = getStokAllLocations(product, size, warnaName);
  return LOCATIONS.reduce((sum, loc) => sum + (s[loc] ?? 0), 0);
}

/**
 * Total stok satu ukuran (semua warna, ATAU "_" utk produk tanpa warna)
 * digabung 3 lokasi.
 * @param {object} product
 * @param {string} size
 * @returns {number}
 */
export function getCombinedStokVariant(product, size) {
  return Object.keys(product.stokByWarna?.[size] ?? {}).reduce(
    (sum, w) => sum + getCombinedStok(product, size, w),
    0,
  );
}

/**
 * Alokasikan `want` unit ke beberapa lokasi secara greedy: isi
 * primaryLocation dulu, baru lokasi lain (urutan LOCATIONS), masing-masing
 * dibatasi stoknya sendiri. `currentBreakdown` (opsional) = alokasi yang
 * sudah ada sebelumnya (dipertahankan, hanya menambah kekurangan).
 * @param {{gudang:number,cideng:number,tegalgubug:number}} params.stokByLoc
 * @param {string} params.primaryLocation
 * @param {{location:string, qty:number}[]} [params.currentBreakdown]
 * @param {number} params.want - total qty yang diinginkan (bukan delta)
 * @returns {{location:string, qty:number}[]} breakdown baru, qty=0 dihilangkan
 */
export function allocateAcrossLocations({
  stokByLoc,
  primaryLocation,
  currentBreakdown = [],
  want,
}) {
  const order = [primaryLocation, ...LOCATIONS.filter((l) => l !== primaryLocation)];
  const used = {};
  for (const b of currentBreakdown) used[b.location] = (used[b.location] ?? 0) + b.qty;
  const result = order.map((loc) => ({
    location: loc,
    qty: Math.min(used[loc] ?? 0, stokByLoc[loc] ?? 0),
  }));
  let remaining = want - result.reduce((s, r) => s + r.qty, 0);
  if (remaining > 0) {
    for (const r of result) {
      if (remaining <= 0) break;
      const cap = stokByLoc[r.location] ?? 0;
      const room = cap - r.qty;
      if (room <= 0) continue;
      const add = Math.min(room, remaining);
      r.qty += add;
      remaining -= add;
    }
  } else if (remaining < 0) {
    // want lebih kecil dari currentBreakdown (qty dikurangi) — buang dari
    // lokasi NON-primary dulu, primary terakhir.
    let toRemove = -remaining;
    const removeOrder = [...LOCATIONS.filter((l) => l !== primaryLocation), primaryLocation];
    for (const loc of removeOrder) {
      if (toRemove <= 0) break;
      const r = result.find((x) => x.location === loc);
      if (!r || r.qty <= 0) continue;
      const cut = Math.min(r.qty, toRemove);
      r.qty -= cut;
      toRemove -= cut;
    }
  }
  return result.filter((r) => r.qty > 0);
}

/**
 * Kelompokkan stok_adjustments (delta negatif = penjualan) per lokasi →
 * total qty diambil per lokasi. Berguna utk badge "Gabungan: Gudang 4,
 * Cideng 2" di Laporan/Riwayat.
 * @param {object} sale
 * @returns {Record<string, number>} e.g. {gudang: 4, cideng: 2}
 */
export function getSaleLocationBreakdown(sale) {
  const adjs = (sale?.stok_adjustments ?? []).filter((a) => a.delta < 0);
  const byLoc = {};
  for (const a of adjs) byLoc[a.location] = (byLoc[a.location] ?? 0) + Math.abs(a.delta);
  return byLoc;
}

/**
 * Label ringkas breakdown lintas lokasi utk satu transaksi, mis.
 * "Gudang 4 · Cideng 2". Hanya tampil kalau transaksi tsb mengambil stok
 * dari >1 lokasi (mode Gabungan) — transaksi normal (1 lokasi) → null.
 * @param {object} sale
 * @returns {string|null}
 */
export function formatSaleLocationBreakdown(sale) {
  const byLoc = getSaleLocationBreakdown(sale);
  const entries = LOCATIONS.filter((loc) => (byLoc[loc] ?? 0) > 0);
  if (entries.length <= 1) return null;
  return entries.map((loc) => `${LOCATION_LABELS[loc] ?? loc} ${byLoc[loc]}`).join(" · ");
}
