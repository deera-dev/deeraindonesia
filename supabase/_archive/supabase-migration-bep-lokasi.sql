-- Migration: tabel lokasi_pasar_biaya (HPP Pasar — biaya tetap per lokasi jualan)
--
-- Ini SATU-SATUNYA tabel baru untuk fitur BEP. Modul lain (BEP per lokasi,
-- saldo akumulatif lintas lokasi, target produksi) sengaja TIDAK dibuat
-- sebagai tabel — semua dihitung live di frontend (packages/shared/lib/bepUtils.js)
-- dari data yang sudah ada (sales.items[].harga/hpp, hpp_template.total_hpp,
-- dan logika hari pasar di marketDay.js). Alasan: data-data itu sudah ada,
-- jadi tidak perlu diduplikasi ke tabel baru — cukup dihitung ulang setiap kali
-- halaman dibuka.
--
-- hari_buka_per_minggu juga TIDAK disimpan di sini — selalu diturunkan dari
-- getMarketLocation() di marketDay.js (Senin+Kamis → Cideng, Jumat → Tegalgubug)
-- supaya tidak ada dua sumber kebenaran soal jadwal pasar.
--
-- Jalankan di Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS lokasi_pasar_biaya (
  lokasi               text PRIMARY KEY,        -- 'cideng' | 'tegalgubug' (cocok dengan LOCATIONS di marketDay.js)
  transport_per_trip   integer NOT NULL DEFAULT 0,  -- ongkos PP sekali jalan (Rp)
  sewa_lapak_per_tahun integer NOT NULL DEFAULT 0,  -- komitmen sewa lapak setahun (Rp)
  updated_at           timestamptz DEFAULT now(),
  updated_by           text
);

-- Seed 2 lokasi pasar yang sudah berjalan, pakai nilai real dari rekap Denny
-- (Rekap_HPP_Pasar_BEP_Cowork.md) — bisa diubah lagi kapan saja lewat UI
-- "Atur Biaya Pasar" di tab BEP kalau ongkos transport/sewa berubah.
INSERT INTO lokasi_pasar_biaya (lokasi, transport_per_trip, sewa_lapak_per_tahun)
VALUES
  ('cideng', 180000, 50000000),
  ('tegalgubug', 1250000, 27000000)
ON CONFLICT (lokasi) DO NOTHING;

-- Kalau migration ini SUDAH pernah dijalankan sebelumnya (jadi INSERT di atas
-- ke-skip karena ON CONFLICT DO NOTHING), jalankan UPDATE ini supaya nilainya
-- ikut diperbarui ke angka real. Hanya menimpa baris yang masih 0/0, supaya
-- tidak menimpa angka yang sudah pernah diubah manual lewat UI:
UPDATE lokasi_pasar_biaya
SET transport_per_trip = 180000, sewa_lapak_per_tahun = 50000000, updated_at = now()
WHERE lokasi = 'cideng' AND transport_per_trip = 0 AND sewa_lapak_per_tahun = 0;

UPDATE lokasi_pasar_biaya
SET transport_per_trip = 1250000, sewa_lapak_per_tahun = 27000000, updated_at = now()
WHERE lokasi = 'tegalgubug' AND transport_per_trip = 0 AND sewa_lapak_per_tahun = 0;

ALTER TABLE lokasi_pasar_biaya ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_lokasi_pasar_biaya" ON lokasi_pasar_biaya
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
