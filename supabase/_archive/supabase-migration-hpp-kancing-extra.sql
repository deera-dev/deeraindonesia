-- Migration: tambah kolom kancing_extra ke hpp_template
-- HPPForm mengirim kancing_extra (array kancing tambahan per-produk),
-- tapi kolom ini belum pernah dibuat di tabel.
-- Tanpa kolom ini setiap insert/update HPP Template gagal.

ALTER TABLE hpp_template
  ADD COLUMN IF NOT EXISTS kancing_extra jsonb NOT NULL DEFAULT '[]';
