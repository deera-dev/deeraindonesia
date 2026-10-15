-- ============================================================
-- Migration: Modul Produksi v3
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Rename bahan_pinjam.dari_siapa -> nama_pemberi
--     (dari_siapa = siapa yang meminjamkan = pemberi pinjaman)
-- ============================================================

ALTER TABLE bahan_pinjam
  RENAME COLUMN dari_siapa TO nama_pemberi;
