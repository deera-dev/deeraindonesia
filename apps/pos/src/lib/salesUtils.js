/**
 * salesUtils.js
 * Fungsi helper yang dipakai di beberapa modul POS (Kasir, Laporan, Struk).
 * Pisahkan di sini agar tidak duplikat antar file.
 */

/**
 * Hitung total qty satu item di keranjang.
 * Item bisa berbasis warna (array) atau simple (angka).
 * @param {{ warna?: {qty:number}[], qty?: number }} item
 * @returns {number}
 */
export function effectiveQty(item) {
  return item.warna ? item.warna.reduce((s, w) => s + w.qty, 0) : (item.qty ?? 0);
}

/**
 * Hitung keuntungan satu item (harga - HPP) × qty.
 * @param {{ harga: number, hpp?: number, warna?, qty? }} item
 * @returns {number}
 */
export function itemProfit(item) {
  const qty = effectiveQty(item);
  return (item.harga - (item.hpp ?? 0)) * qty;
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
