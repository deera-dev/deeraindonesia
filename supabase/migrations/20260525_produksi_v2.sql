-- ============================================================
-- Migration: Modul Produksi v2
-- Tanggal: 2026-05-25
-- Deskripsi:
--   - Tambah tabel hpp_template (HPP tersimpan per produk)
--   - ALTER bahan_pembelian: hapus motif, tambah jumlah_warna
--   - ALTER bahan_pinjam: tambah nama_peminjam (yang meminjam bahan)
-- ============================================================

-- ── 1. ALTER bahan_pembelian ─────────────────────────────────
-- Hapus kolom motif, tambah jumlah_warna
ALTER TABLE bahan_pembelian
  DROP COLUMN IF EXISTS motif,
  ADD COLUMN IF NOT EXISTS jumlah_warna integer NOT NULL DEFAULT 1;

-- ── 2. ALTER bahan_pinjam ────────────────────────────────────
-- Hapus kolom motif, tambah nama_peminjam (orang yang MENERIMA pinjaman = kita)
-- Ganti makna dari_siapa → nama_pemberi (orang yang MEMBERIKAN pinjaman)
ALTER TABLE bahan_pinjam
  DROP COLUMN IF EXISTS motif,
  ADD COLUMN IF NOT EXISTS jumlah_warna  integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nama_peminjam text;  -- siapa yang meminjam (nama toko kita / person)

-- ── 3. Tabel hpp_template ────────────────────────────────────
-- Menyimpan template HPP per produk. Bisa diupdate kapan saja.
-- Saat disimpan, products.hpp otomatis diperbarui.
CREATE TABLE IF NOT EXISTS hpp_template (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_produk text        REFERENCES products(kode) ON UPDATE CASCADE ON DELETE SET NULL,

  -- Bahan yang digunakan (per baju):
  -- [{bahan_id, bahan_type, nama_bahan, kode_bahan, satuan, qty_per_baju, harga_satuan, subtotal}]
  bahan_items jsonb       NOT NULL DEFAULT '[]',

  -- Komponen biaya
  upah_jahit  integer     NOT NULL DEFAULT 0,  -- ongkos jahit (bisa berbeda per batch)
  bordir      integer     NOT NULL DEFAULT 0,  -- 0 = tidak ada bordir
  kancing_qty integer     NOT NULL DEFAULT 0,
  catatan     text,

  -- Komponen dari hpp_config (snapshot saat simpan)
  config_snapshot jsonb,

  -- Total HPP per baju (dihitung saat save)
  total_hpp   integer     NOT NULL DEFAULT 0,

  updated_at  timestamptz DEFAULT now(),
  updated_by  text
);

ALTER TABLE hpp_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hpp_template_select" ON hpp_template FOR SELECT TO authenticated USING (true);
CREATE POLICY "hpp_template_insert" ON hpp_template FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hpp_template_update" ON hpp_template FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hpp_template_delete" ON hpp_template FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS hpp_template_kode_idx ON hpp_template (kode_produk);
