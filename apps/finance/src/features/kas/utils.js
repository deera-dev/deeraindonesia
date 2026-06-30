/**
 * utils.js — Pure helpers fitur Kas (opsi kategori).
 * Tidak ada React, tidak ada Supabase.
 */

// Kolom kategori di tabel kas bersifat free-text (tidak ada CHECK constraint),
// daftar ini hanya untuk memudahkan input lewat dropdown.
export const KAS_KATEGORI_OPTIONS = [
  "Operasional",
  "Bahan & Produksi",
  "Gaji & Upah",
  "Transport",
  "Sewa",
  "Marketing",
  "Lainnya",
];
