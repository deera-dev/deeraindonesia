-- ── Tambah kolom audit ke product_history ────────────────────────────────────
-- before_snapshot : snapshot data SEBELUM perubahan (untuk diff audit)
-- category        : kategori event — 'produk' | 'transfer' | 'stok'

ALTER TABLE product_history
  ADD COLUMN IF NOT EXISTS before_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'produk';

-- Index untuk filter cepat per kategori + tanggal
CREATE INDEX IF NOT EXISTS idx_product_history_category
  ON product_history (category);

CREATE INDEX IF NOT EXISTS idx_product_history_changed_at
  ON product_history (changed_at DESC);
