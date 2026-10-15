-- ============================================================
-- Migration: Produksi v6
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Tambah jumlah_baju_studio ke hpp_template
--     (untuk merekonstruksi pembagi saat edit template)
--
-- Catatan:
--   Biaya studio sudah ada di hpp_config dengan key "studio_foto".
--   Tidak perlu insert row baru.
-- ============================================================

ALTER TABLE hpp_template
  ADD COLUMN IF NOT EXISTS jumlah_baju_studio integer NOT NULL DEFAULT 1;
