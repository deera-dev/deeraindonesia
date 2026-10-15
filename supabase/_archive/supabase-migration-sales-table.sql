-- Migration: Tambah tabel sales untuk POS
-- Jalankan di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sales (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date             date NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  buyer_name       text,
  items            jsonb NOT NULL DEFAULT '[]',
  -- items shape: [{kode, nama, size, harga, qty}]
  total            integer NOT NULL DEFAULT 0,
  created_by_email text,
  created_by_name  text
);

-- Index untuk laporan per tanggal
CREATE INDEX IF NOT EXISTS sales_date_idx ON sales (date DESC);

-- RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policy: hanya user yang login bisa baca & tulis
DROP POLICY IF EXISTS "Authenticated users can read sales"  ON sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON sales;

CREATE POLICY "Authenticated users can read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);
