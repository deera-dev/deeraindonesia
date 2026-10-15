-- ============================================================
-- Migration: Tambah kolom `video` di tabel products
-- Kolom ini menyimpan URL video produk di Cloudinary.
-- Jalankan di Supabase Dashboard → SQL Editor → Run
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS video text;

-- Verifikasi: kolom video sekarang harus muncul
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'products' AND column_name = 'video';
