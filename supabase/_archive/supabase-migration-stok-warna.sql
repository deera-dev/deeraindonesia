-- ============================================================
-- DEERA — Stok per Warna per Lokasi
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tabel utama: stok per kode × size × warna × lokasi
CREATE TABLE IF NOT EXISTS stok_warna (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        text        NOT NULL,
  size        text        NOT NULL,
  warna       text        NOT NULL,
  gudang      integer     NOT NULL DEFAULT 0,
  cideng      integer     NOT NULL DEFAULT 0,
  tegalgubug  integer     NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kode, size, warna)
);

CREATE INDEX IF NOT EXISTS stok_warna_kode_idx ON stok_warna(kode);
CREATE INDEX IF NOT EXISTS stok_warna_kode_size_idx ON stok_warna(kode, size);

-- RLS
ALTER TABLE stok_warna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stok authenticated read"
  ON stok_warna FOR SELECT TO authenticated USING (true);

CREATE POLICY "stok authenticated insert"
  ON stok_warna FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "stok authenticated update"
  ON stok_warna FOR UPDATE TO authenticated USING (true);

CREATE POLICY "stok authenticated delete"
  ON stok_warna FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Update tabel sales: tambah kolom baru
-- ============================================================

-- Tipe transaksi: 'sale' (pembelian) atau 'retur' (pengembalian)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'sale';

-- Lokasi pasar tempat transaksi terjadi
ALTER TABLE sales ADD COLUMN IF NOT EXISTS location text;

-- Daftar penyesuaian stok untuk di-apply saat sync (offline support)
-- Format: [{"kode":"D-82-SFN","size":"Midi","warna":"Hitam","location":"cideng","delta":-2}, ...]
ALTER TABLE sales ADD COLUMN IF NOT EXISTS stok_adjustments jsonb NOT NULL DEFAULT '[]';
