-- Migration: buat tabel product_history untuk audit trail
-- Jalankan di Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS product_history (
  id          bigserial PRIMARY KEY,
  action      text NOT NULL,          -- 'tambah' | 'edit' | 'hapus'
  kode        text NOT NULL,
  nama        text,
  snapshot    jsonb,                  -- state produk saat perubahan terjadi
  changed_at  timestamptz NOT NULL DEFAULT now()
);

-- Index supaya query order by changed_at DESC cepat
CREATE INDEX IF NOT EXISTS idx_product_history_changed_at ON product_history (changed_at DESC);
