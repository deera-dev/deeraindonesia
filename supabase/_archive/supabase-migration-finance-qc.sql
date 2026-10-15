-- Migration: Tim QC — per-karyawan QC pay tracking
-- Run after supabase-migration-finance.sql

-- 1. Extend karyawan.tim CHECK constraint to include 'qc'
ALTER TABLE karyawan DROP CONSTRAINT IF EXISTS karyawan_tim_check;
ALTER TABLE karyawan ADD CONSTRAINT karyawan_tim_check
  CHECK (tim IN ('potong','jahit','finishing','qc','kreatif','lainnya'));

-- 2. Create per-karyawan gaji_qc table
CREATE TABLE IF NOT EXISTS gaji_qc (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gajian_id   uuid NOT NULL REFERENCES gajian_minggu(id) ON DELETE CASCADE,
  karyawan_id uuid REFERENCES karyawan(id),
  jumlah_pcs  integer DEFAULT 0,
  total_upah  integer DEFAULT 0,
  catatan     text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_gajian    ON gaji_qc(gajian_id);
CREATE INDEX IF NOT EXISTS idx_qc_karyawan  ON gaji_qc(karyawan_id);

-- RLS
ALTER TABLE gaji_qc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gaji_qc_all" ON gaji_qc;
CREATE POLICY "gaji_qc_all" ON gaji_qc FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Add total_qc column to gajian_minggu if not present
ALTER TABLE gajian_minggu ADD COLUMN IF NOT EXISTS total_qc integer DEFAULT 0;

-- Tambah kolom nama_produk ke gaji_qc untuk tracking produk per QC entry
ALTER TABLE gaji_qc ADD COLUMN IF NOT EXISTS nama_produk text;
