-- Redesign v_jahit_dikerjakan (permintaan Denny, 2026-08): gabung semua
-- warna jadi satu total per kode+ukuran, karena staf Tim Jahit sering tidak
-- mengisi warna spesifik saat input kartu (contoh nyata: D-012-ZUR, 45 pcs
-- Midi tercatat tanpa warna sama sekali di kartu_items). Sebelumnya view ini
-- di-group per kode+size+warna sehingga entri semacam itu tidak pernah
-- cocok dengan baris warna manapun di stok_warna — badge "sudah dikerjakan"
-- jadi tidak pernah muncul untuk produk-produk yang datanya dicatat begitu.
--
-- Info "sudah dikerjakan" sekarang level UKURAN (bukan per-warna lagi) —
-- lihat apps/admin/src/features/stok-opname/components/ProductOpnameCard.jsx
-- (badge dipindah ke judul grup ukuran) dan utils.js dikerjakanKey(kode,size).
--
-- Sekalian normalisasi casing "ukuran" via initcap+trim — data lama ada yang
-- tersimpan "MIDI" (uppercase) sementara konvensi SIZE_PRESETS di app pakai
-- "Midi" (title case); tanpa normalisasi ini keduanya dianggap ukuran
-- berbeda dan gagal match ke stok_warna.
DROP VIEW IF EXISTS v_jahit_dikerjakan;

CREATE VIEW v_jahit_dikerjakan AS
SELECT
  item->>'kode' AS kode,
  NULLIF(initcap(trim(item->>'ukuran')), '') AS size,
  SUM(COALESCE((item->>'jumlah')::numeric, 0))::integer AS total_dikerjakan
FROM gaji_jahit, jsonb_array_elements(kartu_items) AS item
WHERE item->>'kode' IS NOT NULL AND item->>'kode' <> ''
GROUP BY item->>'kode', NULLIF(initcap(trim(item->>'ukuran')), '');

NOTIFY pgrst, 'reload schema';
