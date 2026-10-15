-- Migration: Tambah kolom warna ke tabel products
-- Jalankan di Supabase SQL Editor

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS warna text[] DEFAULT '{}';

-- Contoh update manual kalau ada produk existing:
-- UPDATE products SET warna = ARRAY['Hitam','Putih','Navy'] WHERE kode = 'D-72-JTB';
