-- ============================================================
-- Migration: Produksi v7
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Hapus baris duplikasi biaya_studio dari hpp_config.
--     Biaya studio sudah ada dengan key "studio" (label: Studio Foto).
--     Row "biaya_studio" tidak sengaja diinsert di v6 versi awal.
-- ============================================================

DELETE FROM hpp_config WHERE key = 'biaya_studio';
