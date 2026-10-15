-- Migration: Tabel sampel untuk modul Produksi
-- Jalankan di Supabase SQL editor

CREATE TABLE IF NOT EXISTS sampel (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor           text UNIQUE NOT NULL,
  nama            text NOT NULL,
  kode_produk     text,
  tanggal         date NOT NULL DEFAULT CURRENT_DATE,
  status          text NOT NULL DEFAULT 'draft',
  -- 'draft' | 'approved' | 'rejected'
  sesuai_sampel   boolean NOT NULL DEFAULT true,
  bahan_items     jsonb NOT NULL DEFAULT '[]',
  -- [{nama_bahan, qty, satuan, keterangan}]
  foto            jsonb NOT NULL DEFAULT '[]',
  -- array Cloudinary URLs
  catatan         text,
  perubahan       text,
  -- catatan perubahan dari referensi sampel
  approved_by     text,
  approved_at     timestamptz,
  rejected_by     text,
  rejected_at     timestamptz,
  rejection_note  text,
  created_by      text,
  created_by_name text,
  batch_id        uuid,
  -- UUID yang sama untuk sampel yang dibuat sekaligus
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: hanya authenticated user
ALTER TABLE sampel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sampel: authenticated full access"
  ON sampel FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS sampel_status_idx ON sampel (status);
CREATE INDEX IF NOT EXISTS sampel_tanggal_idx ON sampel (tanggal DESC);
CREATE INDEX IF NOT EXISTS sampel_created_at_idx ON sampel (created_at DESC);

-- Trigger updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sampel_updated_at ON sampel;
CREATE TRIGGER sampel_updated_at
  BEFORE UPDATE ON sampel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Jika tabel sudah ada, jalankan ini:
ALTER TABLE sampel ADD COLUMN IF NOT EXISTS batch_id uuid;
