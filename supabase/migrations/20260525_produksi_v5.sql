-- ============================================================
-- Migration: Produksi v5
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Tambah biaya_studio ke hpp_template
--     (biaya foto/video katalog yang diamortisasi per baju)
-- ============================================================

ALTER TABLE hpp_template
  ADD COLUMN IF NOT EXISTS biaya_studio integer NOT NULL DEFAULT 0;
