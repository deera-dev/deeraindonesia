-- ============================================================
-- Migration: Produksi v8
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Jadikan jatuh_tempo di bahan_pinjam nullable
--     (bahan pinjam tidak selalu punya jatuh tempo)
-- ============================================================

ALTER TABLE bahan_pinjam
  ALTER COLUMN jatuh_tempo DROP NOT NULL;
