-- ============================================================
-- DEERA — Database Pelanggan
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS pelanggan (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       text        NOT NULL,
  no_hp      text,
  alamat     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pelanggan_nama_idx ON pelanggan(lower(nama));
CREATE INDEX IF NOT EXISTS pelanggan_no_hp_idx ON pelanggan(no_hp);

ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pelanggan authenticated read"
  ON pelanggan FOR SELECT TO authenticated USING (true);
CREATE POLICY "pelanggan authenticated insert"
  ON pelanggan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pelanggan authenticated update"
  ON pelanggan FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pelanggan authenticated delete"
  ON pelanggan FOR DELETE TO authenticated USING (true);

-- Tambah kolom ke sales: pelanggan_id (opsional, bisa null)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS pelanggan_id uuid REFERENCES pelanggan(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_hp    text;
