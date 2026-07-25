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
