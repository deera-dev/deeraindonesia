-- Migration: finance_config
-- Tabel konfigurasi tarif upah untuk apps/finance.
-- Nilai bisa diubah dari halaman Pengaturan (/pengaturan).

CREATE TABLE IF NOT EXISTS finance_config (
  key         text PRIMARY KEY,
  label       text,
  nilai       integer NOT NULL DEFAULT 0,
  updated_at  timestamptz DEFAULT now()
);

-- Seed default values
INSERT INTO finance_config (key, label, nilai) VALUES
  ('tarif_pola',         'Tarif Pola / lembar',      50000),
  ('tarif_sampel',       'Tarif Sampel / lembar',    100000),
  ('tarif_gosok',        'Gosok / pcs',              1300),
  ('tarif_lipat',        'Lipat / pcs',              700),
  ('tarif_buang_benang', 'Buang Benang / pcs',       300),
  ('tarif_pasang_pin',   'Pasang Pin / pcs',         300),
  ('tarif_hangtag',      'Hangtag & Kode / pcs',     200),
  ('tarif_seri',         'Seri / pcs',               200),
  ('tarif_kancing',      'Kancing / buah',           150),
  ('tarif_qc',           'QC / pcs',                 500),
  ('tarif_video',        'Video Kreatif / video',    50000),
  ('tarif_foto',         'Foto Seri / seri',         30000),
  ('tarif_logo',         'Logo / logo',              20000)
ON CONFLICT (key) DO NOTHING;

-- RLS: hanya user autentikasi yang bisa baca/update
ALTER TABLE finance_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_config_read"   ON finance_config;
DROP POLICY IF EXISTS "finance_config_update" ON finance_config;

CREATE POLICY "finance_config_read"
  ON finance_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "finance_config_update"
  ON finance_config FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
