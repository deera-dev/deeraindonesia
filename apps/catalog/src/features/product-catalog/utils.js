/**
 * features/product-catalog/utils.js — pure helpers untuk fitur katalog.
 * Tidak ada import React, tidak ada Supabase — murni fungsi.
 */

/**
 * isBaru(createdAt, days)
 * True kalau produk dibuat dalam N hari terakhir (default 14 hari) —
 * dipakai untuk menampilkan badge "BARU" di CatalogSlide.
 */
export function isBaru(createdAt, days = 14) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diffMs = Date.now() - created;
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

/**
 * filterProducts(products, query)
 * Filter produk by kode ATAU nama (case-insensitive substring match).
 * Query kosong/whitespace mengembalikan array kosong (bukan seluruh produk)
 * supaya SearchModal tidak menampilkan daftar penuh sebelum user mengetik.
 */
export function filterProducts(products, query) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [];
  return (products ?? []).filter((p) => {
    const kode = (p.kode ?? "").toLowerCase();
    const nama = (p.nama ?? "").toLowerCase();
    return kode.includes(q) || nama.includes(q);
  });
}


/**
 * sortCatalogProducts(products)
 * Filter produk yang punya foto & urutkan created_at desc — urutan resmi
 * yang dipakai di scroll katalog (CatalogPage) DAN navigasi
 * sebelumnya/selanjutnya di halaman detail (product-detail/utils.js),
 * supaya urutan konsisten di kedua tempat.
 */
export function sortCatalogProducts(products) {
  return [...(products ?? [])]
    .filter((p) => !!p.image)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}


/**
 * getFilterOptions(products)
 * Ambil daftar unik "bahan" & "ukuran" (dari variants[].size) yang benar-
 * benar ada di data produk, terurut alfabet — dipakai untuk render chip
 * pilihan di FilterModal supaya opsi selalu sesuai data asli (tidak ada
 * daftar hardcode yang bisa basi).
 */
export function getFilterOptions(products) {
  const bahanSet = new Set();
  const ukuranSet = new Set();
  for (const p of products ?? []) {
    if (p.bahan) bahanSet.add(p.bahan);
    for (const v of p.variants ?? []) {
      if (v.size) ukuranSet.add(v.size);
    }
  }
  return {
    bahanList: [...bahanSet].sort((a, b) => a.localeCompare(b)),
    ukuranList: [...ukuranSet].sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * filterByAttributes(products, { bahan, ukuran })
 * Filter produk by bahan persis (exact match) DAN/ATAU tersedia dalam
 * ukuran tertentu (cek variants[].size). bahan/ukuran bernilai null berarti
 * dimensi itu tidak difilter. Kalau keduanya null, kembalikan products
 * apa adanya (tidak ada filter aktif).
 */
export function filterByAttributes(products, { bahan, ukuran } = {}) {
  if (!bahan && !ukuran) return products ?? [];
  return (products ?? []).filter((p) => {
    const matchBahan = !bahan || p.bahan === bahan;
    const matchUkuran = !ukuran || (p.variants ?? []).some((v) => v.size === ukuran);
    return matchBahan && matchUkuran;
  });
}

/**
 * Urutan "kemengesankan-an" periode Terlaris — dipakai pickBestPeriode()
 * untuk memilih satu label saat satu kode masuk top-3 di >1 periode
 * sekaligus (mis. top-3 minggu ini SEKALIGUS top-3 bulan ini). Periode yang
 * lebih pendek/baru dianggap lebih relevan buat reseller (tren saat ini),
 * jadi diprioritaskan lebih dulu.
 */
const PERIODE_PRIORITY = ["7d", "30d", "90d", "all"];

export function pickBestPeriode(a, b) {
  if (!a) return b;
  if (!b) return a;
  return PERIODE_PRIORITY.indexOf(a) <= PERIODE_PRIORITY.indexOf(b) ? a : b;
}

export const TERLARIS_LABELS = {
  "7d": "Terlaris Minggu Ini",
  "30d": "Terlaris Bulan Ini",
  "90d": "Terlaris 3 Bulan",
  all: "Best Seller",
};
