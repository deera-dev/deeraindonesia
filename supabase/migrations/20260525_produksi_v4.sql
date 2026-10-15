-- ============================================================
-- Migration: Produksi v4
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Buat kolom products.image nullable (foto bersifat opsional)
-- ============================================================

ALTER TABLE products ALTER COLUMN image DROP NOT NULL;
