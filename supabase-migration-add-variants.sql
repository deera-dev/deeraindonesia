-- Migration: tambah kolom bahan, variants, stok, dan hpp ke tabel products
-- Jalankan di Supabase Dashboard -> SQL Editor

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS bahan text,
  ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hpp integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stok_gudang integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stok_cideng integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stok_tegalgubug integer DEFAULT 0;

-- Contoh struktur variants:
-- [{"size":"Midi","ld":110,"pb":130,"harga":230000},{"size":"Gamis","ld":110,"pb":140,"harga":240000}]
