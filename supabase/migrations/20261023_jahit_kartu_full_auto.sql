-- ── Kartu Jahit Full Automated (permintaan Denny 2026-10) ─────────────────────
-- Menghilangkan input manual kode/ukuran/warna/jumlah/upah di Kanban Jahit
-- (sudah otomatis dari produksi_batch sejak migration 20260912_jahit_kanban)
-- dan di Gajian > Tim Jahit (baru, lewat scan barcode kartu fisik).
--
-- 1. Tukang Potong dicatat sekali per batch produksi (satu batch = satu kali
--    potong kain) — dipakai di kartu Jahit yang di-print, join lewat
--    jahit_cards.batch_id, TIDAK disalin ke jahit_cards (hindari data basi
--    kalau batch diedit setelah kartu dibuat).
ALTER TABLE produksi_batch
  ADD COLUMN tukang_potong_id   uuid REFERENCES karyawan(id) ON DELETE SET NULL,
  ADD COLUMN tukang_potong_nama text;

-- 2. Link kartu Jahit ↔ entri gaji Tim Jahit yang dibuat dari scan barcode
--    kartu (lihat fetchJahitCardById/saveJahit di
--    apps/finance/src/features/gajian/api.js). Dipakai untuk:
--    - menandai kartu sudah "dipakai" di suatu entri gaji (cegah scan ganda
--      tanpa sadar — kartu lain tetap bisa, sekadar peringatan di form)
--    - melepas kartu (balik ke ready_finishing) kalau entri gaji itu
--      diedit/dihapus, supaya kartu bisa di-scan ulang.
ALTER TABLE jahit_cards
  ADD COLUMN gajian_jahit_id uuid REFERENCES gaji_jahit(id) ON DELETE SET NULL;

CREATE INDEX idx_jahit_cards_gajian_jahit_id ON jahit_cards(gajian_jahit_id);
