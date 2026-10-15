-- Tambah kolom manual_overrides ke gajian_minggu
-- Struktur: { "potong": { "aktif": true, "jumlah": 500000, "catatan": "..." }, ... }
ALTER TABLE gajian_minggu
  ADD COLUMN IF NOT EXISTS manual_overrides jsonb DEFAULT '{}'::jsonb;
